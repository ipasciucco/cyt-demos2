sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "sap/ui/model/odata/v2/ODataModel"
], function (JSONModel, Device, ODataModel) {
    "use strict";

    return {

        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },
        
        createOdataModel: function (oView) {
            var appBaseUrl = jQuery.sap.getModulePath("com.cyt.zmmportalproveedoresordenescompras2021111116");
            var serviceDest = 'ECC_CYT_HTTP_PTALPROV';
            
            var oDataModel = new ODataModel(appBaseUrl + '/proxy/' + serviceDest + '/sap/opu/odata/sap/ZCL_MM_PORTAL_PRO_SRV', { useBatch:false});
            oView.setModel(oDataModel, "ODataModel");
        }

    };
});