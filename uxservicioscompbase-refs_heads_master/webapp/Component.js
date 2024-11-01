sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "com/cyt/zuxportalesbase2021111116/model/models",
],
    function (UIComponent, Device, models) {
        "use strict";

        return UIComponent.extend("com.cyt.zuxportalesbase2021111116.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {

                var language = localStorage.getItem("Language");
                if (language && (language === 'ES' || language === 'EN' || language === 'PT')) {
                    sap.ui.getCore().getConfiguration().setLanguage(language);
                } else {
                    localStorage.setItem("Language", 'EN');
                    sap.ui.getCore().getConfiguration().setLanguage('EN');
                }

                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");


                // sap.ushell.Container.getRenderer("fiori2").hideHeaderItem("backBtn", true);

            }
        });
    }
);