/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"comcyt./zmm_portalproveedores_ordenescompras_2021111116/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
