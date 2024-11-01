sap.ui.define([], function () {
	"use strict";
	return {
        numberDots: function(int, moneda) {
            try{
                var float = parseFloat(int.replace(/\./g,'').replace(',','.'));
                var oFormat = sap.ui.core.format.NumberFormat.getCurrencyInstance({
                    "currencyCode": false,
                    "showMeasure": false,
                    "decimals": 2,
                    "customCurrencies": {
                        "CLP": {
                            "symbol": "",
                            "decimals": 0
                        }
                    }
                });

                if(moneda === 'CLP'){
                    return oFormat.format(float,moneda);
                }else{
                    return oFormat.format(float);
                }
            }catch(e) {
                return int;
            }
        },
               
        userType: function(type) {
            var resourceBundle = this.getView().getModel("i18n").getResourceBundle();
            switch (type) {
				case "F":
                    return resourceBundle.getText("factoring")
				case "P":
                    return resourceBundle.getText("proveedor")
                case "I":
                    return resourceBundle.getText("interno")
				default:
					return type;
			}
        },
        
        // blockedText: function (sStatus, model) {
		// 	var resourceBundle = this.getView().getModel("i18n").getResourceBundle();
		// 	switch (sStatus) {
		// 		case "B":
		// 		case "P":
        //         case "":
		// 			return "";
		// 		default:
		// 			return resourceBundle.getText("bloqueada");
		// 	}
		// },
        
        // statusText: function (sStatus) {
        //     var resourceBundle = this.getView().getModel("i18n").getResourceBundle();
		// 	switch (sStatus) {
		// 		case "":
        //             return resourceBundle.getText("pendiente")
        //         case "A":
        //             return resourceBundle.getText("aprobado")
        //         case "R":
		// 		    return resourceBundle.getText("reclamada")
        //         default:
		// 		    return resourceBundle.getText("pendiente")
        //     }
		// },

        invoiceNumber: function(number) {
            if(number.charAt(0) == "E" || number.charAt(0) == "e") {
                var final = number.substring(1)
                return final
            } else {
                return number
            }
        }
        
	};
});