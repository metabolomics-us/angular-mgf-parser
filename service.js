/**
 * Created by Gert on 6/16/2014.
 */
'use strict';

angular.module('wohlgemuth.mgf.parser', []).
    service('gwMgfService', function ($log) {

        //reference to our service
        var self = this;

        /**
         * parses the name field content and modifies the spectra object accordingly
         * @param value
         * @param spectraObject
         * @returns {*}
         */
        function handleName(value, spectra) {

            //check if we have a Retention Index in the name field
            var nameMatch = /(.+)_RI(.*)/.exec(value);
            var nameCombinedWithInstruments = /\s*([:\w\d\s-]+);/.exec(value);
            if (nameMatch) {
                //sets the new name
                spectra.name = trim(nameMatch[1]);

                //adds it as retention index
                spectra.meta.push(
                    {name: 'Retention Index', value: trim(nameMatch[2]), category: findCategory('Retention Index')}
                )
            }
            else if (nameCombinedWithInstruments) {
                spectra.name = trim(nameCombinedWithInstruments[1]);
            }
            else {

                spectra.name = trim(value);
            }

            return spectra
        }

        /**
         * handles a given metadata field and might does additional modifcations
         * @param value
         * @param spectra
         * @param regex regular expression, must provide 2 groups!
         * @param category
         * @returns {*}
         */
        function handleMetaDataField(value, spectra, regex, category) {
            if (angular.isUndefined(category)) {
                category = "none"
            }
            var extractValue = regex;
            var match = extractValue.exec(value);

            while (match != null) {

                var name = trim(match[1]);
                var parsedValue = trim(match[2]);
                if (ignoreField(name, parsedValue) == false) {
                    spectra.meta.push(
                        {
                            name: name, value: parsedValue, category: category
                        }
                    );
                }
                match = extractValue.exec(value);
            }
            return spectra;
        }

        /**
         * simple trimming function
         */
        function trim(str) {
            return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        }

        /**
         * inspects our metadata fields and does additional modifications, as required
         * @param match
         * @param spectra
         * @returns {*}
         */
        function inspectFields(match, spectra) {
            //comment fields have quite often additional infomation in them
            if (match[1].toLowerCase() === 'comment') {
                spectra = handleMetaDataField(match[2], spectra, /(\w+)\s*=\s*([0-9]*\.?[0-9]+)/g);
            }
            //can contain a lot of different id's in case of massbank generated msp files
            else if (match[1].toLowerCase() === 'searchid') {
                spectra = handleMetaDataField(match[2], spectra, /(\w+\s?\w*)+:\s*([\w\d]+[ \w\d-]+)/g, "Database Identifier");
            }
            //this mass bank special flag provides some derivatization information
            else if (match[1].toLowerCase() === 'ms$focused_ion') {
                spectra = handleMetaDataField(match[2], spectra, /\s*(.+):(.+)/g, "Derivatization");
            }
            //any other metadata field
            else {
                var name = match[1];
                var value = match[2];

                if (ignoreField(name, value) == false) {
                    //assign metadata
                    spectra.meta.push(
                        {
                            name: name,
                            value: value,
                            category: findCategory(name)
                        }
                    )
                }
            }

            return spectra;
        }

        /**
         * finds the related category for the given name, Will be an additional module at a later point TODO
         * @param name
         */
        function findCategory(name) {
            var name = name.toLocaleLowerCase();

            var category = "none";
            //masspectral properties
            if (name === '') {

            }
            else if (
                name === 'num peaks' ||
                name === 'retentionindex' ||
                name === 'retentiontime'
                ) {
                category = "spectral properties";
            }

            //aquisition properties
            else if (name === 'instrument' || name === 'instrumenttype' || name == 'ionmode' || name == 'precursormz') {
                category = "acquisition properties";
            }

            return category

        }

        /**
         * ignores a given field, if a certain value is not as exspected. Will be an additional module at a later point TODO
         * @param name
         * @param value
         * @returns {boolean}
         */
        function ignoreField(name, value) {

            if (value.length == 0) {
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
            else if(name == "synon"){
                return true;
            }
            else if(name == "id"){
                return true
            }

            return false;
        }

        /**
         * converts the data using a callback
         * @param data
         * @param callback
         */
        this.convertWithCallback = function (data, callback) {

            $log.debug("starting with parsing new data set...");

            /**
             * checks for a complete block of mgf data.
             * @type {RegExp}
             */
            var blockRegEx = /BEGIN IONS([\s\S]*?)END IONS/g;

            /**
             * extracts the attributes like 'name' and 'value' from a found line
             * @type {RegExp}
             */
            var regExAttributes = /([^=\s]+)=(.*)/g;

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
                //contains the resulting spectrum object
                var spectrum = {meta: []};

                //parse attributes and metadata
                while ((match = regExAttributes.exec(block)) != null) {
                    if (match[1].toLowerCase() === 'name') {
                        //in case there are RI encoded we extract this information
                        spectrum = handleName(match[2], spectrum);
                    } else {
                        spectrum = inspectFields(match, spectrum);
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
                    if (angular.isDefined(match[3])) {
                        spectrum.meta.push({name: trim(match[3]), value: match[1], category: 'annotation'});
                    }
                }

                //join ions to create spectrum string
                spectrum.spectrum = ions.join(' ');


                //make sure we have at least a spectrum and a name
                if (spectrum.spectrum != '' && spectrum.name != null) {
                    callback(spectrum);
                } else {
                    $log.warn('invalid spectrum found -> ignored');
                }
            }
        };

        this.convertFromData = function (data, callback) {
            return this.convertWithCallback(data, callback);
        };
    });