
import initMixin from './init';
import PluginApi from './pluginAPI'
import Data from './data';
import {initTurk} from "./turk";

function JsPsych (options) {
    this._init(options)
}

JsPsych.prototype.plugins = {
    parameterType: {
        BOOL: 0,
        STRING: 1,
        INT: 2,
        FLOAT: 3,
        FUNCTION: 4,
        KEYCODE: 5,
        SELECT: 6,
        HTML_STRING: 7,
        IMAGE: 8,
        AUDIO: 9,
        VIDEO: 10,
        OBJECT: 11,
        COMPLEX: 12
    },
    universalPluginParameters: {
        data: {
            type: module.parameterType.OBJECT,
            pretty_name: 'Data',
            default: {},
            description: 'Data to add to this trial (key-value pairs)'
        },
        on_start: {
            type: module.parameterType.FUNCTION,
            pretty_name: 'On start',
            default: function () {
                return;
            },
            description: 'Function to execute when trial begins'
        },
        on_finish: {
            type: module.parameterType.FUNCTION,
            pretty_name: 'On finish',
            default: function () {
                return;
            },
            description: 'Function to execute when trial is finished'
        },
        on_load: {
            type: module.parameterType.FUNCTION,
            pretty_name: 'On load',
            default: function () {
                return;
            },
            description: 'Function to execute after the trial has loaded'
        },
        post_trial_gap: {
            type: module.parameterType.INT,
            pretty_name: 'Post trial gap',
            default: null,
            description: 'Length of gap between the end of this trial and the start of the next trial'
        }
    }
};

initMixin(JsPsych);
initTurk(jsPsych);
JsPsych.prototype.pluginAPI = new PluginApi();
JsPsych.prototype.data = new Data();

export default JsPsych;