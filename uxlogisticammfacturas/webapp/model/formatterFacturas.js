sap.ui.define([
    'com/cyt/zuxportalesbase2021111116/model/formatter',
], function (formatter) {
    "use strict";
    return {
        numberDots: formatter.numberDots,

        blockedText: function (sStatus, model) {
            var resourceBundle = this.getView().getModel("i18n").getResourceBundle();
            switch (sStatus) {
                case "B":
                case "P":
                case "":
                    return "";
                default:
                    return resourceBundle.getText("bloqueada");
            }
        },

        statusText: function (sStatus) {
            var resourceBundle = this.getView().getModel("i18n").getResourceBundle();
            switch (sStatus) {
                case "":
                    return resourceBundle.getText("pendiente")
                case "A":
                    return resourceBundle.getText("aprobado")
                case "R":
                    return resourceBundle.getText("reclamada")
                case "-":
                    return "-"
                default:
                    return resourceBundle.getText("pendiente")
            }
        },

        invoiceNumber: function (number) {
            if (number.charAt(0) == "E" || number.charAt(0) == "e") {
                var final = number.substring(1)
                return final
            } else {
                return number
            }
        }

    };
});