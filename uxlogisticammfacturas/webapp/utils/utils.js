sap.ui.define([], function () {
    "use strict";

    return {
        getLanguage: function () {
            var language = localStorage.getItem("Language");
            if(!language){
                sap.ui.getCore().getConfiguration().getLanguage();
            }
            return language;
        }
    };
});