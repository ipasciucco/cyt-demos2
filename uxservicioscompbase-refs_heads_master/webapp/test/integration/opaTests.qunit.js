/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require(["com/cyt/zuxportalesbase2021111116/test/integration/AllJourneys"
	], function () {
		QUnit.start();
	});
});
