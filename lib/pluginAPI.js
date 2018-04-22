import JsPsych from './core'
import {convertKeyCharacterToKeyCode, flatten, unique} from './utility'


export default class PluginAPI {
    constructor() {
        /** {boolean} Indicates whether this instance of jspsych has opened a hardware connection through our browser extension */
        this.hardwareConnected = false;

        this.held_keys = {};

        this.keyboard_listeners = [];

        this.timeout_handlers = [];

        this.preloads = [];

        this.img_cache = {};

        this.context = null;

        this.audio_buffers = [];

        //it might be useful to open up a line of communication from the extension back to this page script,
        //again, this will have to pass through DOM events. For now speed is of no concern so I will use jQuery
        const self = this;
        document.addEventListener("jspsych-activate", function (evt) {
            self.hardwareConnected = true;
        })
    }


    root_keydown_listener(e){
        for(let i=0; i< this.keyboard_listeners.length; i++){
            this.keyboard_listeners[i].fn(e);
        }
        this.held_keys[e.keyCode] = true;
    }
    root_keyup_listener(e){
        this.held_keys[e.keyCode] = false;
    }

    reset(root_element){
        this.keyboard_listeners = [];
        this.held_keys = {};
        root_element.removeEventListener('keydown', root_keydown_listener);
        root_element.removeEventListener('keyup', root_keyup_listener);
    }

    createKeyboardEventListeners(root_element){
        root_element.addEventListener('keydown', root_keydown_listener);
        root_element.addEventListener('keyup', root_keyup_listener);
    }

    getKeyboardResponse(parameters) {
        //parameters are: callback_function, valid_responses, rt_method, persist, audio_context, audio_context_start_time, allow_held_key?

        parameters.rt_method = (typeof parameters.rt_method === 'undefined') ? 'date' : parameters.rt_method;
        if (parameters.rt_method !== 'date' && parameters.rt_method !== 'performance' && parameters.rt_method !== 'audio') {
            console.log('Invalid RT method specified in getKeyboardResponse. Defaulting to "date" method.');
            parameters.rt_method = 'date';
        }

        let start_time;
        if (parameters.rt_method === 'date') {
            start_time = (new Date()).getTime();
        } else if (parameters.rt_method === 'performance') {
            start_time = performance.now();
        } else if (parameters.rt_method === 'audio') {
            start_time = parameters.audio_context_start_time;
        }

        let listener_id;

        const listener_function = function (e) {

            let key_time;
            if (parameters.rt_method === 'date') {
                key_time = (new Date()).getTime();
            } else if (parameters.rt_method === 'performance') {
                key_time = performance.now();
            } else if (parameters.rt_method === 'audio') {
                key_time = parameters.audio_context.currentTime
            }

            let valid_response = false;
            if (typeof parameters.valid_responses === 'undefined' || parameters.valid_responses === JsPsych.ALL_KEYS) {
                valid_response = true;
            } else {
                if (parameters.valid_responses !== jsPsych.NO_KEYS) {
                    for (var i = 0; i < parameters.valid_responses.length; i++) {
                        if (typeof parameters.valid_responses[i] === 'string') {
                            var kc = convertKeyCharacterToKeyCode(parameters.valid_responses[i]);
                            if (typeof kc !== 'undefined') {
                                if (e.keyCode === kc) {
                                    valid_response = true;
                                }
                            } else {
                                throw new Error('Invalid key string specified for getKeyboardResponse');
                            }
                        } else if (e.keyCode === parameters.valid_responses[i]) {
                            valid_response = true;
                        }
                    }
                }
            }
            // check if key was already held down

            if (((typeof parameters.allow_held_key === 'undefined') || !parameters.allow_held_key) && valid_response) {
                if (typeof held_keys[e.keyCode] !== 'undefined' && held_keys[e.keyCode] === true) {
                    valid_response = false;
                }
            }

            if (valid_response) {

                parameters.callback_function({
                    key: e.keyCode,
                    rt: key_time - start_time
                });

                if (this.keyboard_listeners.includes(listener_id)) {

                    if (!parameters.persist) {
                        // remove keyboard listener
                        module.cancelKeyboardResponse(listener_id);
                    }
                }
            }
        };

        // create listener id object
        listener_id = {
            type: 'keydown',
            fn: listener_function
        };

        // add this keyboard listener to the list of listeners
        this.keyboard_listeners.push(listener_id);

        return listener_id;

    };

    cancelKeyboardResponse(listener) {
        // remove the listener from the list of listeners
        if (this.keyboard_listeners.includes(listener)) {
            this.keyboard_listeners.splice(this.keyboard_listeners.indexOf(listener), 1);
        }
    };

    cancelAllKeyboardResponses() {
        this.keyboard_listeners = [];
    };


    // timeout registration

    setTimeout(callback, delay){
        var handle = setTimeout(callback, delay);
        this.timeout_handlers.push(handle);
        return handle;
    }

    clearAllTimeouts(){
        for(var i=0;i<this.timeout_handlers.length; i++){
            clearTimeout(this.timeout_handlers[i]);
        }
        this.timeout_handlers = [];
    }

    // audio //

    initAudio(){
        this.context = (JsPsych.initSettings().use_webaudio === true) ? JsPsych.webaudio_context : null;
    }

    audioContext(){
        return this.context;
    }

    getAudioBuffer(audioID) {

        if (this.audio_buffers[audioID] == 'tmp') {
            console.error('Audio file failed to load in the time alloted.')
            return;
        }

        return this.audio_buffers[audioID];

    }

    // preloading stimuli //


    preloadAudioFiles(files, callback_complete, callback_load) {

        files = flatten(files);
        files = unique(files);

        let n_loaded = 0;
        const loadfn = (typeof callback_load === 'undefined') ? function () {
        } : callback_load;
        const finishfn = (typeof callback_complete === 'undefined') ? function () {
        } : callback_complete;

        if(files.length===0){
            finishfn();
            return;
        }

        function load_audio_file_webaudio(source, count){
            count = count || 1;
            var request = new XMLHttpRequest();
            request.open('GET', source, true);
            request.responseType = 'arraybuffer';
            request.onload = function() {
                context.decodeAudioData(request.response, function(buffer) {
                    this.audio_buffers[source] = buffer;
                    n_loaded++;
                    loadfn(n_loaded);
                    if(n_loaded === files.length) {
                        finishfn();
                    }
                }, function() {
                    console.error('Error loading audio file: ' + bufferID);
                });
            }
            request.onerror = function(){
                if(count < JsPsych.initSettings().max_preload_attempts){
                    setTimeout(function(){
                        load_audio_file_webaudio(source, count+1)
                    }, 200);
                } else {
                    JsPsych.loadFail();
                }
            }
            request.send();
        }

        function load_audio_file_html5audio(source, count){
            count = count || 1;
            const audio = new Audio();
            audio.addEventListener('canplaythrough', function(){
                this.audio_buffers[source] = audio;
                n_loaded++;
                loadfn(n_loaded);
                if(n_loaded === files.length){
                    finishfn();
                }
            });
            audio.addEventListener('onerror', function(){
                if(count < JsPsych.initSettings().max_preload_attempts){
                    setTimeout(function(){
                        load_audio_file_html5audio(source, count+1)
                    }, 200);
                } else {
                    JsPsych.loadFail();
                }
            });
            audio.addEventListener('onstalled', function(){
                if(count < JsPsych.initSettings().max_preload_attempts){
                    setTimeout(function(){
                        load_audio_file_html5audio(source, count+1)
                    }, 200);
                } else {
                    JsPsych.loadFail();
                }
            });
            audio.addEventListener('onabort', function(){
                if(count < JsPsych.initSettings().max_preload_attempts){
                    setTimeout(function(){
                        load_audio_file_html5audio(source, count+1)
                    }, 200);
                } else {
                    JsPsych.loadFail();
                }
            });
            audio.src = source;
        }

        for (let i = 0; i < files.length; i++) {
            const bufferID = files[i];
            if (typeof this.audio_buffers[bufferID] !== 'undefined') {
                n_loaded++;
                loadfn(n_loaded);
                if(n_loaded === files.length) {
                    finishfn();
                }
            } else {
                this.audio_buffers[bufferID] = 'tmp';
                if(module.audioContext() !== null){
                    load_audio_file_webaudio(bufferID);
                } else {
                    load_audio_file_html5audio(bufferID);
                }
            }
        }

    }

   preloadImages(images, callback_complete, callback_load) {

        // flatten the images array
        images = JsPsych.utils.flatten(images);
        images = JsPsych.utils.unique(images);

       let n_loaded = 0;
       const loadfn = (typeof callback_load === 'undefined') ? function () {
       } : callback_load;
       const finishfn = (typeof callback_complete === 'undefined') ? function () {
       } : callback_complete;

       if(images.length===0){
            finishfn();
            return;
        }

        function preload_image(source, count){
            count = count || 1;

            const img = new Image();

            img.onload = function() {
                n_loaded++;
                loadfn(n_loaded);
                if (n_loaded === images.length) {
                    finishfn();
                }
            };

            img.onerror = function() {
                if(count < jsPsych.initSettings().max_preload_attempts){
                    setTimeout(function(){
                        preload_image(source, count+1);
                    }, 200);
                } else {
                    jsPsych.loadFail();
                }
            }

            img.src = source;

            this.img_cache[source] = img;
        }

        for (let i = 0; i < images.length; i++) {
            preload_image(images[i]);
        }

    };

    registerPreload(plugin_name, parameter, media_type, conditional_function) {
        if (!(media_type === 'audio' || media_type === 'image')) {
            console.error('Invalid media_type parameter for jsPsych.pluginAPI.registerPreload. Please check the plugin file.');
        }

        const preload = {
            plugin: plugin_name,
            parameter: parameter,
            media_type: media_type,
            conditional_function: conditional_function
        };

        this.preloads.push(preload);
    }

    autoPreload(timeline, callback, images, audio, progress_bar) {
        // list of items to preload
        images = typeof images === 'undefined' ? [] : images;
        audio = typeof audio === 'undefined' ? [] : audio;

        // construct list
        for (let i = 0; i < this.preloads.length; i++) {
            const type = this.preloads[i].plugin;
            const param = this.preloads[i].parameter;
            const media = this.preloads[i].media_type;
            const func = this.preloads[i].conditional_function;
            const trials = timeline.trialsOfType(type);
            for (let j = 0; j < trials.length; j++) {
                if (typeof trials[j][param] !== 'undefined' && typeof trials[j][param] !== 'function') {
                    if ( typeof func === 'undefined' || func(trials[j]) ){
                        if (media === 'image') {
                            images = images.concat(jsPsych.utils.flatten([trials[j][param]]));
                        } else if (media === 'audio') {
                            audio = audio.concat(jsPsych.utils.flatten([trials[j][param]]));
                        }
                    }
                }
            }
        }

        images = unique(images);
        audio  = unique(audio);

        const total_n = images.length + audio.length;
        let loaded = 0;

        if(progress_bar){
            let pb_html = "<div id='jspsych-loading-progress-bar-container' style='height: 10px; width: 300px; background-color: #ddd;'>";
            pb_html += "<div id='jspsych-loading-progress-bar' style='height: 10px; width: 0%; background-color: #777;'></div>";
            pb_html += "</div>";
            jsPsych.getDisplayElement().innerHTML = pb_html;
        }

        function update_loading_progress_bar(){
            loaded++;
            if(progress_bar){
                var percent_loaded = (loaded/total_n)*100;
                jsPsych.getDisplayElement().querySelector('#jspsych-loading-progress-bar').style.width = percent_loaded+"%";
            }
        }

        // do the preloading
        // first the images, then when the images are complete
        // wait for the audio files to finish
        module.preloadImages(images, function() {
            module.preloadAudioFiles(audio, function() {
                callback();
            }, update_loading_progress_bar);
        }, update_loading_progress_bar);
    }

    /**
     * Allows communication with user hardware through our custom Google Chrome extension + native C++ program
     * @param		{object}	mess	The message to be passed to our extension, see its documentation for the expected members of this object.
     * @author	Daniel Rivas
     *
     */
    hardware(mess){
        //since Chrome extension content-scripts do not share the javascript environment with the page script that loaded jspsych,
        //we will need to use hacky methods like communicating through DOM events.
        let jspsychEvt = new CustomEvent('jspsych', {detail: mess});
        document.dispatchEvent(jspsychEvt);
        //And voila! it will be the job of the content script injected by the extension to listen for the event and do the appropriate actions.
    };
}
