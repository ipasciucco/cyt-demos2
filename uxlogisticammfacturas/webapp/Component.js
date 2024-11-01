jQuery.sap.registerModulePath("com.cyt.zuxportalesbase2021111116", "/com-cyt-zuxportalesbase2021111116.comcytzuxportalesbase2021111116/");
//jQuery.sap.registerModulePath("com.cyt.zuxportalesbase2021111116", "https://cyt-aws-us.cpp.cfapps.us10.hana.ondemand.com/com-cyt-zuxportalesbase2021111116.comcytzuxportalesbase2021111116/");

sap.ui.define([
        "com/cyt/zuxportalesbase2021111116/Component",
        "sap/ui/Device",
        "com/cyt/zmmportalproveedoresfacturas2021111116/model/models",
        "sap/ui/model/resource/ResourceModel"
    ],
    function (UIComponent, Device, models, ResourceModel) {
        "use strict";

        return UIComponent.extend("com.cyt.zmmportalproveedoresfacturas2021111116.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");

                sap.ushell.Container.getRenderer("fiori2").hideHeaderItem("backBtn", true);

                var oI18nBase = this.getModel("i18n");
                var oI18nCustom = this.getModel("i18nCustom");
                oI18nBase.enhance({bundleUrl: oI18nCustom.getResourceBundle().oUrlInfo.url });
            }
        });
    }
);
