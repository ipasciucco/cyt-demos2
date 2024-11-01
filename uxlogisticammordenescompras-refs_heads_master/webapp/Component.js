jQuery.sap.registerModulePath("com.cyt.zuxportalesbase2021111116", "/com-cyt-zuxportalesbase2021111116.comcytzuxportalesbase2021111116/");
//jQuery.sap.registerModulePath("com.cyt.zuxportalesbase2021111116", "https://cyt-aws-us.cpp.cfapps.us10.hana.ondemand.com/com-cyt-zuxportalesbase2021111116.comcytzuxportalesbase2021111116/");

sap.ui.define([
        "com/cyt/zuxportalesbase2021111116/Component",
        "sap/ui/Device",
        "com/cyt/zmmportalproveedoresordenescompras2021111116/model/models",
        "sap/ui/model/resource/ResourceModel"
    ],
    function (UIComponent, Device, models, ResourceModel) {
        "use strict";

        return UIComponent.extend("com.cyt.zmmportalproveedoresordenescompras2021111116.Component", {
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

                // this.getRouter().getTargets().addTarget("TargetServicios",{viewName:"listOCServicios",viewPath:"com.cyt.zmmportalproveedoresordenescompras2021111116.view",rootView:this.getAggregation("rootControl").getId()});
                // this.getRouter().getTargets().addTarget("TargetMateriales",{viewName:"listOCMateriales",viewPath:"com.cyt.zmmportalproveedoresordenescompras2021111116.view",rootView:this.getAggregation("rootControl").getId()});
                
                // this.getRouter().addRoute({name:"RouteServicios",pattern:"OCServicios",target:"TargetServicios"});
                // this.getRouter().addRoute({name:"RouteMateriales",pattern:"OCMateriales",target:"TargetMateriales"});
                this.getRouter().initialize();
                

                sap.ushell.Container.getRenderer("fiori2").hideHeaderItem("backBtn", true);

                var oI18nBase = this.getModel("i18n");
                var oI18nCustom = this.getModel("i18nCustom");
                oI18nBase.enhance({bundleUrl: oI18nCustom.getResourceBundle().oUrlInfo.url });

            }
        });
    }
);
