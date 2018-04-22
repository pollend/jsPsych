import {deepCopy} from "./utility";

class TimelineNode {

    // a unique ID for this node, relative to the parent
    relative_id;

    // store the parent for this node
    parent_node;

    // parameters for the trial if the node contains a trial
    trial_parameters;

    // parameters for nodes that contain timelines
    timeline_parameters;

    // stores trial information on a node that contains a timeline
    // used for adding new trials
    node_trial_data;

    // track progress through the node
    progress = {
        current_location: -1, // where on the timeline (which timelinenode)
        current_variable_set: 0, // which set of variables to use from timeline_variables
        current_repetition: 0, // how many times through the variable set on this run of the node
        current_iteration: 0, // how many times this node has been revisited
        done: false
    }

    constructor(parameters, parent, relativeID) {
        // store a link to the parent of this node
        this.parent_node = parent;

        // create the ID for this node
        if (typeof parent === 'undefined') {
            this.relative_id = 0;
        } else {
            this.relative_id = relativeID;
        }

        // check if there is a timeline parameter
        // if there is, then this node has its own timeline
        if ((typeof parameters.timeline !== 'undefined') || (typeof jsPsych.plugins[trial_type] === 'function')) {

            // create timeline properties
            this.timeline_parameters = {
                timeline: [],
                loop_function: parameters.loop_function,
                conditional_function: parameters.conditional_function,
                sample: parameters.sample,
                randomize_order: typeof parameters.randomize_order === 'undefined' ? false : parameters.randomize_order,
                repetitions: typeof parameters.repetitions === 'undefined' ? 1 : parameters.repetitions,
                timeline_variables: typeof parameters.timeline_variables === 'undefined' ? [{}] : parameters.timeline_variables
            };

            self.setTimelineVariablesOrder();

            // extract all of the node level data and parameters
            let node_data = Object.assign({}, parameters);
            delete node_data.timeline;
            delete node_data.conditional_function;
            delete node_data.loop_function;
            delete node_data.randomize_order;
            delete node_data.repetitions;
            delete node_data.timeline_variables;
            delete node_data.sample;
            this.node_trial_data = node_data; // store for later...

            // create a TimelineNode for each element in the timeline
            for (let i = 0; i < parameters.timeline.length; i++) {
                this.timeline_parameters.timeline.push(new TimelineNode(Object.assign({}, node_data, parameters.timeline[i]), self, i));
            }

        }
        // if there is no timeline parameter, then this node is a trial node
        else {
            // check to see if a valid trial type is defined
            let trial_type = parameters.type;
            if (typeof trial_type === 'undefined') {
                console.error('Trial level node is missing the "type" parameter. The parameters for the node are: ' + JSON.stringify(parameters));
            } else if ((typeof jsPsych.plugins[trial_type] === 'undefined') && (trial_type.toString().replace(/\s/g, '') !== "function(){returntimeline.timelineVariable(varname);}")) {
                console.error('No plugin loaded for trials of type "' + trial_type + '"');
            }
            // create a deep copy of the parameters for the trial
            this.trial_parameters = Object.assign({}, parameters);
        }

    }


    // recursively get the next trial to run.
    // if this node is a leaf (trial), then return the trial.
    // otherwise, recursively find the next trial in the child timeline.
    trial() {
        if (typeof this.timeline_parameters === 'undefined') {
            // returns a clone of the trial_parameters to
            // protect functions.
            return deepCopy(this.trial_parameters);
        } else {
            if (progress.current_location >= this.timeline_parameters.timeline.length) {
                return null;
            } else {
                return this.timeline_parameters.timeline[progress.current_location].trial();
            }
        }
    }

    markCurrentTrialComplete() {
        if (typeof this.timeline_parameters === 'undefined') {
            progress.done = true;
        } else {
            this.timeline_parameters.timeline[progress.current_location].markCurrentTrialComplete();
        }
    }

    nextRepetiton() {
        this.setTimelineVariablesOrder();
        this.progress.current_location = -1;
        this.progress.current_variable_set = 0;
        this.progress.current_repetition++;
        for (let i = 0; i < this.timeline_parameters.timeline.length; i++) {
            this.timeline_parameters.timeline[i].reset();
        }
    }

    // set the order for going through the timeline variables array
    // TODO: this is where all the sampling options can be implemented
    setTimelineVariablesOrder() {

        // check to make sure this node has variables
        if (typeof this.timeline_parameters === 'undefined' || typeof this.timeline_parameters.timeline_variables === 'undefined') {
            return;
        }

        let order = [];
        for (let i = 0; i < this.timeline_parameters.timeline_variables.length; i++) {
            order.push(i);
        }

        if (typeof this.timeline_parameters.sample !== 'undefined') {
            if (this.timeline_parameters.sample.type === 'custom') {
                order = this.timeline_parameters.sample.fn(order);
            } else if (this.timeline_parameters.sample.type === 'with-replacement') {
                order = jsPsych.randomization.sampleWithReplacement(order, this.timeline_parameters.sample.size, this.timeline_parameters.sample.weights);
            } else if (this.timeline_parameters.sample.type === 'without-replacement') {
                order = jsPsych.randomization.sampleWithoutReplacement(order, this.timeline_parameters.sample.size);
            } else if (this.timeline_parameters.sample.type === 'fixed-repetitions') {
                order = jsPsych.randomization.repeat(order, this.timeline_parameters.sample.size, false);
            }
        }

        if (this.timeline_parameters.randomize_order) {
            order = jsPsych.randomization.shuffle(order);
        }

        this.progress.order = order;
    }

    // next variable set
    nextSet() {
        this.progress.current_location = -1;
        this.progress.current_variable_set++;
        for (let i = 0; i < this.timeline_parameters.timeline.length; i++) {
            this.timeline_parameters.timeline[i].reset();
        }
    }

    // update the current trial node to be completed
    // returns true if the node is complete after advance (all subnodes are also complete)
    // returns false otherwise
    advance() {

        // first check to see if done
        if (this.progress.done) {
            return true;
        }

        // if node has not started yet (progress.current_location == -1),
        // then try to start the node.
        if (this.progress.current_location === -1) {
            // check for conditonal function on nodes with timelines
            if (typeof this.timeline_parameters !== 'undefined') {
                if (typeof this.timeline_parameters.conditional_function !== 'undefined') {
                    let conditional_result = this.timeline_parameters.conditional_function();
                    // if the conditional_function() returns false, then the timeline
                    // doesn't run and is marked as complete.
                    if (conditional_result === false) {
                        progress.done = true;
                        return true;
                    }
                    // if the conditonal_function() returns true, then the node can start
                    else {
                        progress.current_location = 0;
                    }
                }
                // if there is no conditional_function, then the node can start
                else {
                    progress.current_location = 0;
                }
            }
            // if the node does not have a timeline, then it can start
            progress.current_location = 0;
            // call advance again on this node now that it is pointing to a new location
            return this.advance();
        }

        // if this node has a timeline, propogate down to the current trial.
        if (typeof this.timeline_parameters !== 'undefined') {

            var have_node_to_run = false;
            // keep incrementing the location in the timeline until one of the nodes reached is incomplete
            while (this.progress.current_location < this.timeline_parameters.timeline.length && have_node_to_run === false) {

                // check to see if the node currently pointed at is done
                let target_complete = this.timeline_parameters.timeline[progress.current_location].advance();
                if (!target_complete) {
                    have_node_to_run = true;
                    return false;
                } else {
                    progress.current_location++;
                }

            }

            // if we've reached the end of the timeline (which, if the code is here, we have)
            // there are a few steps to see what to do next...

            // first, check the timeline_variables to see if we need to loop through again
            // with a new set of variables
            if (progress.current_variable_set < progress.order.length - 1) {
                // reset the progress of the node to be with the new set
                this.nextSet();
                // then try to advance this node again.
                return this.advance();
            }

            // if we're all done with the timeline_variables, then check to see if there are more repetitions
            else if (progress.current_repetition < this.timeline_parameters.repetitions - 1) {
                this.nextRepetiton();
                return this.advance();
            }

            // if we're all done with the repetitions, check if there is a loop function.
            else if (typeof this.timeline_parameters.loop_function !== 'undefined') {
                if (this.timeline_parameters.loop_function(this.generatedData())) {
                    this.reset();
                    return this.parent_node.advance();
                } else {
                    progress.done = true;
                    return true;
                }
            }

            // no more loops on this timeline, we're done!
            else {
                progress.done = true;
                return true;
            }

        }
    }

    // check the status of the done flag
    isComplete() {
        return this.progress.done;
    }

    // getter method for timeline variables
    getTimelineVariableValue(variable_name) {
        if (typeof this.timeline_parameters === 'undefined') {
            return undefined;
        }
        return timeline_parameters.timeline_variables[progress.order[progress.current_variable_set]][variable_name];
    }

    // recursive upward search for timeline variables
    findTimelineVariable(variable_name) {
        let v = this.getTimelineVariableValue(variable_name);
        if (typeof v === 'undefined') {
            if (typeof this.parent_node !== 'undefined') {
                return this.parent_node.findTimelineVariable(variable_name);
            } else {
                return undefined;
            }
        } else {
            return v;
        }
    }

    // recursive downward search for active trial to extract timeline variable
    timelineVariable(variable_name) {
        if (typeof this.timeline_parameters === 'undefined') {
            return this.findTimelineVariable(variable_name);
        } else {
            return this.timeline_parameters.timeline[progress.current_location].timelineVariable(variable_name);
        }
    }

    // recursively get the number of **trials** contained in the timeline
    // assuming that while loops execute exactly once and if conditionals
    // always run
    length() {
        let length = 0;
        if (typeof this.timeline_parameters !== 'undefined') {
            for (let i = 0; i < this.timeline_parameters.timeline.length; i++) {
                length += this.timeline_parameters.timeline[i].length();
            }
        } else {
            return 1;
        }
        return length;
    }

    // return the percentage of trials completed, grouped at the first child level
    // counts a set of trials as complete when the child node is done
    percentComplete() {
        let total_trials = this.length();
        let completed_trials = 0;
        for (let i = 0; i < this.timeline_parameters.timeline.length; i++) {
            if (this.timeline_parameters.timeline[i].isComplete()) {
                completed_trials += this.timeline_parameters.timeline[i].length();
            }
        }
        return (completed_trials / total_trials * 100)
    }

    // resets the node and all subnodes to original state
    // but increments the current_iteration counter
    reset() {
        progress.current_location = -1;
        progress.current_repetition = 0;
        progress.current_variable_set = 0;
        progress.current_iteration++;
        progress.done = false;
        this.setTimelineVariablesOrder();
        if (typeof this.timeline_parameters !== 'undefined') {
            for (var i = 0; i < this.timeline_parameters.timeline.length; i++) {
                this.timeline_parameters.timeline[i].reset();
            }
        }

    }

    // mark this node as finished
    end() {
        this.progress.done = true;
    }

    // recursively end whatever sub-node is running the current trial
    endActiveNode() {
        if (typeof this.timeline_parameters === 'undefined') {
            this.end();
            this.parent_node.end();
        } else {
            this.timeline_parameters.timeline[progress.current_location].endActiveNode();
        }
    }

    // get a unique ID associated with this node
    // the ID reflects the current iteration through this node.
    ID() {
        let id = "";
        if (typeof this.parent_node === 'undefined') {
            return "0." + progress.current_iteration;
        } else {
            id += this.parent_node.ID() + "-";
            id += this.relative_id + "." + progress.current_iteration;
            return id;
        }
    }

    // get the ID of the active trial
    activeID() {
        if (typeof this.timeline_parameters === 'undefined') {
            return this.ID();
        } else {
            return this.timeline_parameters.timeline[progress.current_location].activeID();
        }
    }

    // get all the data generated within this node
    generatedData() {
        return jsPsych.data.getDataByTimelineNode(this.ID());
    }

    // get all the trials of a particular type
    trialsOfType(type) {
        if (typeof this.timeline_parameters === 'undefined') {
            if (trial_parameters.type === type) {
                return trial_parameters;
            } else {
                return [];
            }
        } else {
            let trials = [];
            for (let i = 0; i < this.timeline_parameters.timeline.length; i++) {
                trials = trials.concat(this.timeline_parameters.timeline[i].trialsOfType(type));
            }
            return trials;
        }
    }

    // add new trials to end of this timeline
    insert(parameters) {
        if (typeof this.timeline_parameters === 'undefined') {
            console.error('Cannot add new trials to a trial-level node.');
        } else {
            this.timeline_parameters.timeline.push(
                new TimelineNode(Object.assign({}, this.node_trial_data, parameters), this, this.timeline_parameters.timeline.length)
            );
        }
    }


}