sap.ui.define([], function () {
	"use strict";
	return {
        numberDots: function(int, moneda) {          
	    debugger;
            // try {
            //     int = parseInt(int);
            //     var string = int.toString();
            //     var array = string.split('');
            //     for(var i = array.length - 3; i > 0 ; i = i - 3 ) {
            //         array.splice(i,0,'.')
            //     }
            //     string = array.join('')
            //     return string;
            // } catch(e) {
            //     return int;
            // }
            try{
                var float = parseFloat(int.replace(/\./g,'').replace(',','.'));
                var oFormat = sap.ui.core.format.NumberFormat.getCurrencyInstance({
                    'currencyCode': false,
                    'showMeasure': false,
                    'decimals': 2,
                    'customCurrencies': {
                        'CLP': {
                            'symbol': '',
                            'decimals': 2,
                        }
                    }
                });

		console.log(`numberDots: ${oFormat.format(float,moneda)}`);
                if(moneda === 'CLP'){
                    return oFormat.format(float,moneda);
                }else{
                    return oFormat.format(float);
                }
            }catch(e) {
		console.log(`(fail) numberDots: ${int}`);
                return int;
            }
        }
	};
});
