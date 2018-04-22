import JsPsych from './JsPsych'

export function initTurk(jsPsych){
    jsPsych.prototype.turk = (function() {

        let module = {};

        // core.turkInfo gets information relevant to mechanical turk experiments. returns an object
        // containing the workerID, assignmentID, and hitID, and whether or not the HIT is in
        // preview mode, meaning that they haven't accepted the HIT yet.
        module.turkInfo = function() {

            const turk = {};

            const param = function (url, name) {
                name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
                const regexS = "[\\?&]" + name + "=([^&#]*)";
                const regex = new RegExp(regexS);
                const results = regex.exec(url);
                return (results == null) ? "" : results[1];
            };

            const src = param(window.location.href, "assignmentId") ? window.location.href : document.referrer;

            const keys = ["assignmentId", "hitId", "workerId", "turkSubmitTo"];
            keys.map(

                function(key) {
                    turk[key] = unescape(param(src, key));
                });

            turk.previewMode = (turk.assignmentId === "ASSIGNMENT_ID_NOT_AVAILABLE");

            turk.outsideTurk = (!turk.previewMode && turk.hitId === "" && turk.assignmentId === "" && turk.workerId === "")

            turk_info = turk;

            return turk;

        };

        // core.submitToTurk will submit a MechanicalTurk ExternalHIT type
        module.submitToTurk = function(data) {

            const turkInfo = JsPsych.turk.turkInfo();
            const assignmentId = turkInfo.assignmentId;
            const turkSubmitTo = turkInfo.turkSubmitTo;

            if (!assignmentId || !turkSubmitTo) return;

            const dataString = [];

            for (let key in data) {

                if (data.hasOwnProperty(key)) {
                    dataString.push(key + "=" + escape(data[key]));
                }
            }

            dataString.push("assignmentId=" + assignmentId);

            window.location.href = turkSubmitTo + "/mturk/externalSubmit?" + dataString.join("&");
        };

        return module;

    })();
}