import JsPsych from './core'

// options
let opts = {};
// experiment timeline
let timeline;
// flow control
let global_trial_index = 0;
let current_trial = {};
let current_trial_finished = false;
// target DOM element
let DOM_container;
let DOM_target;
// time that the experiment began
let exp_start_time;
// is the experiment paused?
let paused = false;
let waiting = false;
// done loading?
let loaded = false;
let loadfail = false;


function startExperiment() {

    loaded = true;

    // show progress bar if requested
    if (opts.show_progress_bar === true) {
        drawProgressBar();
    }

    // record the start time
    exp_start_time = new Date();

    // begin!
    timeline.advance();
    doTrial(timeline.trial());

}

function finishExperiment() {

    if(typeof timeline.end_message !== 'undefined'){
        DOM_target.innerHTML = timeline.end_message;
    }

    opts.on_finish(JsPsych.data.get());

}

function nextTrial() {
    // if experiment is paused, don't do anything.
    if(paused) {
        waiting = true;
        return;
    }

    global_trial_index++;
    current_trial_finished = false;

    // advance timeline
    timeline.markCurrentTrialComplete();
    let complete = timeline.advance();

    // update progress bar if shown
    if (opts.show_progress_bar === true && opts.auto_update_progress_bar == true) {
        updateProgressBar();
    }

    // check if experiment is over
    if (complete) {
        finishExperiment();
        return;
    }

    doTrial(timeline.trial());
}

function doTrial(trial) {

    current_trial = trial;

    // process all timeline variables for this trial
    evaluateTimelineVariables(trial);

    // evaluate variables that are functions
    evaluateFunctionParameters(trial);

    // get default values for parameters
    setDefaultValues(trial);

    // call experiment wide callback
    opts.on_trial_start(trial);

    // call trial specific callback if it exists
    if(typeof trial.on_start == 'function'){
        trial.on_start(trial);
    }

    // execute trial method
    JsPsych.plugins[trial.type].trial(DOM_target, trial);

    // call trial specific loaded callback if it exists
    if(typeof trial.on_load == 'function'){
        trial.on_load();
    }
}

function evaluateTimelineVariables(trial){
    var keys = Object.keys(trial);

    for (var i = 0; i < keys.length; i++) {
        // timeline variables on the root level
        if (typeof trial[keys[i]] == "function" && trial[keys[i]].toString().replace(/\s/g,'') == "function(){returntimeline.timelineVariable(varname);}") {
            trial[keys[i]] = trial[keys[i]].call();
        }
        // timeline variables that are nested in objects
        if (typeof trial[keys[i]] == "object" && trial[keys[i]] !== null){
            evaluateTimelineVariables(trial[keys[i]]);
        }
    }
}

function evaluateFunctionParameters(trial){

    // first, eval the trial type if it is a function
    if(typeof trial.type === 'function'){
        trial.type = trial.type.call();
    }

    // now eval the whole trial
    var keys = Object.keys(trial);

    for (var i = 0; i < keys.length; i++) {
        if(keys[i] !== 'type'){
            if(
                (typeof JsPsych.plugins.universalPluginParameters[keys[i]] !== 'undefined' && JsPsych.plugins.universalPluginParameters[keys[i]].type !== JsPsych.plugins.parameterType.FUNCTION ) ||
                (typeof JsPsych.plugins[trial.type].info.parameters[keys[i]] !== 'undefined' && JsPsych.plugins[trial.type].info.parameters[keys[i]].type !== JsPsych.plugins.parameterType.FUNCTION)
            ) {
                if (typeof trial[keys[i]] == "function") {
                    trial[keys[i]] = trial[keys[i]].call();
                }
            }
        }
    }
}

function setDefaultValues(trial){
    var trial_parameters = Object.keys(JsPsych.plugins[trial.type].info.parameters);
    for(var i=0; i<trial_parameters.length; i++){
        if(typeof trial[trial_parameters[i]] === 'undefined' || trial[trial_parameters[i]] === null){
            if(typeof JsPsych.plugins[trial.type].info.parameters[trial_parameters[i]].default === 'undefined'){
                console.error('You must specify a value for the '+trial_parameters[i]+' parameter in the '+trial.type+' plugin.');
            } else {
                trial[trial_parameters[i]] = JsPsych.plugins[trial.type].info.parameters[trial_parameters[i]].default;
            }
        }
    }
}

function checkExclusions(exclusions, success, fail){
    let clear = true;

    // MINIMUM SIZE
    if(typeof exclusions.min_width !== 'undefined' || typeof exclusions.min_height !== 'undefined'){
        const mw = typeof exclusions.min_width !== 'undefined' ? exclusions.min_width : 0;
        const mh = typeof exclusions.min_height !== 'undefined' ? exclusions.min_height : 0;
        const w = window.innerWidth;
        const h = window.innerHeight;
        if(w < mw || h < mh){
            clear = false;
            const interval = setInterval(function(){
                const w = window.innerWidth;
                const h = window.innerHeight;
                if(w < mw || h < mh){
                    core.getDisplayElement().innerHTML = '<p>Your browser window is too small to complete this experiment. '+
                        'Please maximize the size of your browser window. If your browser window is already maximized, '+
                        'you will not be able to complete this experiment.</p>'+
                        '<p>The minimum width is '+mw+'px. Your current width is '+w+'px.</p>'+
                        '<p>The minimum height is '+mh+'px. Your current height is '+h+'px.</p>';
                } else {
                    clearInterval(interval);
                    core.getDisplayElement().innerHTML = '';
                    checkExclusions(exclusions, success, fail);
                }
            }, 100);
            return; // prevents checking other exclusions while this is being fixed
        }
    }

    // WEB AUDIO API
    if(typeof exclusions.audio !== 'undefined' && exclusions.audio) {
        if(window.hasOwnProperty('AudioContext') || window.hasOwnProperty('webkitAudioContext')){
            // clear
        } else {
            clear = false;
            core.getDisplayElement().innerHTML = '<p>Your browser does not support the WebAudio API, which means that you will not '+
                'be able to complete the experiment.</p><p>Browsers that support the WebAudio API include '+
                'Chrome, Firefox, Safari, and Edge.</p>';
            fail();
            return;
        }
    }

    // GO?
    if(clear){ success(); }
}

function drawProgressBar() {
    document.querySelector('.jspsych-display-element').insertAdjacentHTML('afterbegin',
        '<div id="jspsych-progressbar-container">'+
        '<span>Completion Progress</span>'+
        '<div id="jspsych-progressbar-outer">'+
        '<div id="jspsych-progressbar-inner"></div>'+
        '</div></div>');
}

function updateProgressBar() {
    let progress = jsPsych.progress();

    document.querySelector('#jspsych-progressbar-inner').style.width = progress.percent_complete + "%";
}



export function initMixin (jsPsych) {

// storing a single webaudio context to prevent problems with multiple inits
// of jsPsych
    jsPsych.prototype.webaudio_context = null;
// temporary patch for Safari
    if (typeof window !== 'undefined' && window.hasOwnProperty('webkitAudioContext') && !window.hasOwnProperty('AudioContext')) {
        window.AudioContext = webkitAudioContext;
    }
// end patch
    jsPsych.prototype.webaudio_context = (typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined') ? new AudioContext() : null;

// enumerated variables for special parameter types
    jsPsych.prototype.ALL_KEYS = 'allkeys';
    jsPsych.prototype.NO_KEYS = 'none';

//
// public methods
//

    jsPsych.prototype.init = function(options) {

        if(typeof options.timeline === 'undefined'){
            console.error('No timeline declared in jsPsych.init. Cannot start experiment.')
        }

        // reset variables
        timeline = null;
        global_trial_index = 0;
        current_trial = {};
        current_trial_finished = false;
        paused = false;
        waiting = false;
        loaded = false;
        loadfail = false;
        jsPsych.data.reset();

        let defaults = {
            'display_element': undefined,
            'on_finish': function(data) {
                return undefined;
            },
            'on_trial_start': function(trial) {
                return undefined;
            },
            'on_trial_finish': function() {
                return undefined;
            },
            'on_data_update': function(data) {
                return undefined;
            },
            'on_interaction_data_update': function(data){
                return undefined;
            },
            'preload_images': [],
            'preload_audio': [],
            'use_webaudio': true,
            'exclusions': {},
            'show_progress_bar': false,
            'auto_update_progress_bar': true,
            'auto_preload': true,
            'show_preload_progress_bar': true,
            'max_load_time': 60000,
            'max_preload_attempts': 10,
            'default_iti': 0
        };

        // override default options if user specifies an option
        opts = Object.assign({}, defaults, options);

        // set DOM element where jsPsych will render content
        // if undefined, then jsPsych will use the <body> tag and the entire page
        if(typeof opts.display_element === 'undefined'){
            // check if there is a body element on the page
            let body = document.querySelector('body');
            if (body === null) {
                document.documentElement.appendChild(document.createElement('body'));
            }
            // using the full page, so we need the HTML element to
            // have 100% height, and body to be full width and height with
            // no margin
            document.querySelector('html').style.height = '100%';
            document.querySelector('body').style.margin = '0px';
            document.querySelector('body').style.height = '100%';
            document.querySelector('body').style.width = '100%';
            opts.display_element = document.querySelector('body');
        } else {
            // make sure that the display element exists on the page
            let display;
            if (opts.display_element instanceof Element) {
                display = opts.display_element;
            } else {
                display = document.querySelector('#' + opts.display_element);
            }
            if(display === null) {
                console.error('The display_element specified in jsPsych.init() does not exist in the DOM.');
            } else {
                opts.display_element = display;
            }
        }
        opts.display_element.innerHTML = '<div class="jspsych-content-wrapper"><div id="jspsych-content"></div></div>';
        DOM_container = opts.display_element;
        DOM_target = document.querySelector('#jspsych-content');

        // add tabIndex attribute to scope event listeners
        opts.display_element.tabIndex = 0;

        // add CSS class to DOM_target
        if(opts.display_element.className.indexOf('jspsych-display-element') === -1){
            opts.display_element.className += ' jspsych-display-element';
        }
        DOM_target.className += 'jspsych-content';

        // create experiment timeline
        timeline = new TimelineNode({
            timeline: opts.timeline
        });

        // initialize audio context based on options and browser capabilities
        JsPsych.pluginAPI.initAudio();

        // below code resets event listeners that may have lingered from
        // a previous incomplete experiment loaded in same DOM.
        JsPsych.pluginAPI.reset(opts.display_element);
        // create keyboard event listeners
        JsPsych.pluginAPI.createKeyboardEventListeners(opts.display_element);
        // create listeners for user browser interaction
        JsPsych.data.createInteractionListeners();

        // check exclusions before continuing
        checkExclusions(opts.exclusions,
            function(){
                // success! user can continue...
                // start experiment, with or without preloading
                if(opts.auto_preload){
                    JsPsych.pluginAPI.autoPreload(timeline, startExperiment, opts.preload_images, opts.preload_audio, opts.show_preload_progress_bar);
                    if(opts.max_load_time > 0){
                        setTimeout(function(){
                            if(!loaded && !loadfail){
                                core.loadFail();
                            }
                        }, opts.max_load_time);
                    }
                } else {
                    startExperiment();
                }
            },
            function(){
                // fail. incompatible user.

            }
        );
    };

    jsPsych.prototype.progress = function() {

        const percent_complete = typeof timeline === 'undefined' ? 0 : timeline.percentComplete();

        return {
            "total_trials": typeof timeline === 'undefined' ? undefined : timeline.length(),
            "current_trial_global": global_trial_index,
            "percent_complete": percent_complete
        };
    };

    jsPsych.prototype.startTime = function() {
        return exp_start_time;
    };

    jsPsych.prototype.totalTime = function() {
        if(typeof exp_start_time === 'undefined'){ return 0; }
        return (new Date()).getTime() - exp_start_time.getTime();
    };

    jsPsych.prototype.getDisplayElement = function() {
        return DOM_target;
    };

    jsPsych.prototype.getDisplayContainerElement = function(){
        return DOM_container;
    }

    jsPsych.prototype.finishTrial = function(data) {

        if(current_trial_finished){ return; }
        current_trial_finished = true;

        // write the data from the trial
        data = typeof data === 'undefined' ? {} : data;
        JsPsych.data.write(data);

        // get back the data with all of the defaults in
        var trial_data = JsPsych.data.get().filter({trial_index: global_trial_index});

        // for trial-level callbacks, we just want to pass in a reference to the values
        // of the DataCollection, for easy access and editing.
        var trial_data_values = trial_data.values()[0];

        // handle callback at plugin level
        if (typeof current_trial.on_finish === 'function') {
            current_trial.on_finish(trial_data_values);
        }

        // handle callback at whole-experiment level
        opts.on_trial_finish(trial_data_values);

        // after the above callbacks are complete, then the data should be finalized
        // for this trial. call the on_data_update handler, passing in the same
        // data object that just went through the trial's finish handlers.
        opts.on_data_update(trial_data_values);

        // wait for iti
        if (typeof current_trial.post_trial_gap === null) {
            if (opts.default_iti > 0) {
                setTimeout(nextTrial, opts.default_iti);
            } else {
                nextTrial();
            }
        } else {
            if (current_trial.post_trial_gap > 0) {
                setTimeout(nextTrial, current_trial.post_trial_gap);
            } else {
                nextTrial();
            }
        }
    };

    jsPsych.prototype.endExperiment = function(end_message) {
        timeline.end_message = end_message;
        timeline.end();
        JsPsych.pluginAPI.cancelAllKeyboardResponses();
        JsPsych.pluginAPI.clearAllTimeouts();
        core.finishTrial();
    };

    jsPsych.prototype.endCurrentTimeline = function() {
        timeline.endActiveNode();
    };

    jsPsych.prototype.currentTrial = function() {
        return current_trial;
    };

    jsPsych.prototype.initSettings = function() {
        return opts;
    };

    jsPsych.prototype.currentTimelineNodeID = function() {
        return timeline.activeID();
    };

    jsPsych.prototype.timelineVariable = function(varname, execute){
        if(execute){
            return timeline.timelineVariable(varname);
        } else {
            return function() { return timeline.timelineVariable(varname); }
        }
    };

    jsPsych.prototype.addNodeToEndOfTimeline = function(new_timeline, preload_callback){
        timeline.insert(new_timeline);
        if(typeof preload_callback !== 'undefinded'){
            if(opts.auto_preload){
                jsPsych.pluginAPI.autoPreload(timeline, preload_callback);
            } else {
                preload_callback();
            }
        }
    };

    jsPsych.prototype.pauseExperiment = function(){
        paused = true;
    };

    jsPsych.prototype.resumeExperiment = function(){
        paused = false;
        if(waiting){
            waiting = false;
            nextTrial();
        }
    };

    jsPsych.prototype.loadFail = function(message){
        message = message || '<p>The experiment failed to load.</p>';
        loadfail = true;
        DOM_target.innerHTML = message;
    };

    jsPsych.prototype.setProgressBar = function(proportion_complete){
        proportion_complete = Math.max(Math.min(1,proportion_complete),0);
        document.querySelector('#jspsych-progressbar-inner').style.width = (proportion_complete*100) + "%";
    };

}