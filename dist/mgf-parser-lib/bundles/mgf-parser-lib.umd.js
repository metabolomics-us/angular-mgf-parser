(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@angular/core'), require('ngx-logger')) :
    typeof define === 'function' && define.amd ? define('mgf-parser-lib', ['exports', '@angular/core', 'ngx-logger'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global['mgf-parser-lib'] = {}, global.ng.core, global.i1));
}(this, (function (exports, i0, i1) { 'use strict';

    var MgfParserLibService = /** @class */ (function () {
        function MgfParserLibService(logger) {
            var _this = this;
            this.logger = logger;
            /**
             * parses the name field content and modifies the spectra object accordingly
             * @param value
             * @param spectraObject
             * @returns {*}
             */
            this.handleName = function (value, spectra) {
                //check if we have a Retention Index in the name field
                var nameMatch = /(.+)_RI(.*)/.exec(value);
                var nameCombinedWithInstruments = /\s*([:\w\d\s-]+);/.exec(value);
                if (nameMatch) {
                    //sets the new name
                    spectra.names.push(_this.trim(nameMatch[1]));
                    //adds it as retention index
                    spectra.meta.push({ name: 'Retention Index', value: _this.trim(nameMatch[2]), category: _this.findCategory('Retention Index') });
                }
                else if (nameCombinedWithInstruments) {
                    spectra.names.push(_this.trim(nameCombinedWithInstruments[1]));
                }
                else {
                    spectra.name = _this.trim(value);
                }
                return spectra;
            };
            /**
             * handles a given metadata field and might does additional modifcations
             * @param value
             * @param spectra
             * @param regex regular expression, must provide 2 groups!
             * @param category
             * @returns {*}
             */
            this.handleMetaDataField = function (value, spectra, regex, category) {
                if (!category) {
                    category = "none";
                }
                var extractValue = regex;
                var match = extractValue.exec(value);
                while (match != null) {
                    var name = _this.trim(match[1]);
                    var parsedValue = _this.trim(match[2]);
                    if (_this.ignoreField(name, parsedValue) == false) {
                        spectra.meta.push({
                            name: name, value: parsedValue, category: category
                        });
                    }
                    match = extractValue.exec(value);
                }
                return spectra;
            };
            /**
             * simple trimming function
             */
            this.trim = function (str) {
                return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '').replace(/^"(.*)"$/, '$1');
            };
            /**
             * inspects our metadata fields and does additional modifications, as required
             * @param match
             * @param spectra
             *
             *
             * @returns {*}
             */
            this.inspectFields = function (match, spectra) {
                var regexInchIKey = /.*([A-Z]{14}-[A-Z]{10}-[A-Z,0-9])+.*/;
                //var regexSmiles = /^([^J][0-9BCOHNSOPrIFla@+\-\[\]\(\)\\\/%=#$,.~&!]{6,})$/;
                var regexSmiles = /^([^J][0-9A-Za-z@+\-\[\]\(\)\\\/%=#$,.~&!]{6,})$/;
                //if we contain an inchi key in any propterty of this field
                if (regexInchIKey.exec(match[2])) {
                    spectra.inchiKey = regexInchIKey.exec(match[2])[1];
                }
                //get an inchi
                else if (match[1].toLowerCase() == 'inchi' || match[1].toLowerCase() == 'inchicode' || match[1].toLowerCase() == 'inchi code') {
                    spectra.inchi = _this.trim(match[2]);
                }
                //get an inchi from a smile
                else if (match[1].toLowerCase() == 'smiles' && regexSmiles.exec(match[2])) {
                    spectra.smiles = regexSmiles.exec(match[2])[1];
                }
                //comment fields have quite often additional infomation in them
                else if (match[1].toLowerCase() === 'comment') {
                    spectra = _this.handleMetaDataField(match[2], spectra, /(\w+)\s*=\s*([0-9]*\.?[0-9]+)/g, undefined);
                }
                //can contain a lot of different id's in case of massbank generated msp files
                else if (match[1].toLowerCase() === 'searchid') {
                    spectra = _this.handleMetaDataField(match[2], spectra, /(\w+\s?\w*)+:\s*([\w\d]+[ \w\d-]+)/g, "Database Identifier");
                }
                //this mass bank special flag provides some derivatization information
                else if (match[1].toLowerCase() === 'ms$focused_ion') {
                    spectra = _this.handleMetaDataField(match[2], spectra, /\s*(.+):(.+)/g, "Derivatization");
                }
                //any other metadata field
                else {
                    var name = match[1];
                    var value = match[2];
                    if (_this.ignoreField(name, value) == false) {
                        //assign metadata
                        spectra.meta.push({
                            name: name,
                            value: value,
                            category: _this.findCategory(name)
                        });
                    }
                }
                return spectra;
            };
            /**
             * finds the related category for the given name, Will be an additional module at a later point TODO
             * @param name
             */
            this.findCategory = function (name) {
                name = name.toLocaleLowerCase();
                var category = "none";
                //masspectral properties
                if (name === '') {
                }
                else if (name === 'retentionindex' || name === 'retention index' ||
                    name === 'retentiontime' || name === 'retention time') {
                    category = "spectral properties";
                }
                //aquisition properties
                else if (name === 'instrument' || name === 'instrumenttype' || name == 'ionmode' || name == 'precursormz') {
                    category = "acquisition properties";
                }
                return category;
            };
            /**
             * ignores a given field, if a certain value is not as exspected. Will be an additional module at a later point TODO
             * @param name
             * @param value
             * @returns {boolean}
             */
            this.ignoreField = function (name, value) {
                if (_this.trim(name) == '' || _this.trim(value) == '') {
                    return true;
                }
                name = name.toLowerCase();
                if (name == "retentiontime" && value <= 0) {
                    return true;
                }
                else if (name == "retentionindex" && value <= 0) {
                    return true;
                }
                //if 0, it doesn't count
                else if ((name === "precursormz" || name === "derivative_mass" || name === 'parent') && value <= 0) {
                    return true;
                }
                //we get this over the inchi key
                else if (name == "formula") {
                    return true;
                }
                else if (name == "synon") {
                    return true;
                }
                else if (name == "id") {
                    return true;
                }
                return false;
            };
            /**
             * converts the data using a callback
             * @param data
             * @param callback
             */
            this.convertWithCallback = function (data, callback) {
                _this.logger.debug("starting with parsing new data set...");
                /**
                 * checks for a complete block of mgf data.
                 * @type {RegExp}
                 */
                var blockRegEx = /BEGIN IONS([\s\S]*?)END IONS/g;
                /**
                 * extracts the attributes like 'name' and 'value' from a found line
                 * @type {RegExp}
                 */
                var regExAttributes = /\s*([^=\s]+)=(.*)\s/g;
                /**
                 * first block captures meta data
                 * second block caputures spectra including floats
                 * optional third block are identifications of this ion
                 * @type {RegExp}
                 */
                var regExSpectra = /^((?:0|[1-9]\d*)(?:\.\d*)?(?:[eE][+\-]?\d+)?)[ \t]((?:0|[1-9]\d*)(?:\.\d*)?(?:[eE][+\-]?\d+)?)[ \t]*(.+)?$/gm;
                /**
                 * is this an accurate mass
                 * @type {RegExp}
                 */
                var regExAccurateMass = /(\d*\.?\d{3,})/;
                var buf = data.toString('utf8');
                var block, match;
                //go over all available blocks
                while ((block = blockRegEx.exec(buf)) != null) {
                    block = block[1];
                    //contains the resulting spectrum object
                    var spectrum = { meta: [], names: [], name: '', spectrum: '', accurate: false };
                    //parse attributes and metadata
                    while ((match = regExAttributes.exec(block)) != null) {
                        if (match[1].toLowerCase() === 'name') {
                            //in case there are RI encoded we extract this information
                            spectrum = _this.handleName(match[2], spectrum);
                        }
                        else {
                            spectrum = _this.inspectFields(match, spectrum);
                        }
                    }
                    //builds the actual spectrum
                    spectrum.accurate = true;
                    var ions = [];
                    while ((match = regExSpectra.exec(block)) != null) {
                        // Convert scientific notation
                        if (match[1].toLowerCase().indexOf('e') > -1) {
                            match[1] = parseFloat(match[1]).toString();
                        }
                        if (match[2].toLowerCase().indexOf('e') > -1) {
                            match[2] = parseFloat(match[2]).toString();
                        }
                        ions.push(match[1] + ":" + match[2]);
                        //used to determine if this is an accurate mass spectrum or not
                        if (!regExAccurateMass.test(match[1])) {
                            spectrum.accurate = false;
                        }
                        //add annotation to metadata if defined
                        if (match[3]) {
                            spectrum.meta.push({ name: _this.trim(match[3]), value: match[1], category: 'annotation' });
                        }
                    }
                    //join ions to create spectrum string
                    spectrum.spectrum = ions.join(' ');
                    //make sure we have at least a spectrum and a name
                    if (spectrum.spectrum != '') {
                        callback(spectrum);
                    }
                    else {
                        _this.logger.warn('invalid spectrum found -> ignored');
                    }
                }
            };
            this.convertFromData = function (data, callback) {
                return _this.convertWithCallback(data, callback);
            };
            /**
             * counts the number of mass spectra in this library file
             * @param data
             * @returns {number}
             */
            this.countSpectra = function (data) {
                var count = 0;
                var pos = data.indexOf('BEGIN IONS', 0);
                while (pos != -1) {
                    count++;
                    pos = data.indexOf('BEGIN IONS', pos + 1);
                }
                return count;
            };
        }
        return MgfParserLibService;
    }());
    MgfParserLibService.ɵfac = function MgfParserLibService_Factory(t) { return new (t || MgfParserLibService)(i0.ɵɵinject(i1.NGXLogger)); };
    MgfParserLibService.ɵprov = i0.ɵɵdefineInjectable({ token: MgfParserLibService, factory: MgfParserLibService.ɵfac, providedIn: 'root' });
    /*@__PURE__*/ (function () {
        i0.ɵsetClassMetadata(MgfParserLibService, [{
                type: i0.Injectable,
                args: [{
                        providedIn: 'root'
                    }]
            }], function () {
            return [{ type: i1.NGXLogger, decorators: [{
                            type: i0.Inject,
                            args: [i1.NGXLogger]
                        }] }];
        }, null);
    })();

    var MgfParserLibModule = /** @class */ (function () {
        function MgfParserLibModule() {
        }
        return MgfParserLibModule;
    }());
    MgfParserLibModule.ɵmod = i0.ɵɵdefineNgModule({ type: MgfParserLibModule });
    MgfParserLibModule.ɵinj = i0.ɵɵdefineInjector({ factory: function MgfParserLibModule_Factory(t) { return new (t || MgfParserLibModule)(); }, providers: [
            MgfParserLibService
        ], imports: [[
                i1.LoggerModule.forRoot({
                    level: i1.NgxLoggerLevel.DEBUG,
                    serverLogLevel: i1.NgxLoggerLevel.OFF
                })
            ]] });
    (function () { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵɵsetNgModuleScope(MgfParserLibModule, { imports: [i1.LoggerModule] }); })();
    /*@__PURE__*/ (function () {
        i0.ɵsetClassMetadata(MgfParserLibModule, [{
                type: i0.NgModule,
                args: [{
                        imports: [
                            i1.LoggerModule.forRoot({
                                level: i1.NgxLoggerLevel.DEBUG,
                                serverLogLevel: i1.NgxLoggerLevel.OFF
                            })
                        ],
                        providers: [
                            MgfParserLibService
                        ]
                    }]
            }], null, null);
    })();

    /*
     * Public API Surface of mgf-parser-lib
     */

    /**
     * Generated bundle index. Do not edit.
     */

    exports.MgfParserLibModule = MgfParserLibModule;
    exports.MgfParserLibService = MgfParserLibService;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=mgf-parser-lib.umd.js.map
