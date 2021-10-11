import { Injectable, Inject } from '@angular/core';
import { NGXLogger } from "ngx-logger";
import * as i0 from "@angular/core";
import * as i1 from "ngx-logger";
export class MgfParserLibService {
    constructor(logger) {
        this.logger = logger;
        /**
         * parses the name field content and modifies the spectra object accordingly
         * @param value
         * @param spectraObject
         * @returns {*}
         */
        this.handleName = (value, spectra) => {
            //check if we have a Retention Index in the name field
            const nameMatch = /(.+)_RI(.*)/.exec(value);
            const nameCombinedWithInstruments = /\s*([:\w\d\s-]+);/.exec(value);
            if (nameMatch) {
                //sets the new name
                spectra.names.push(this.trim(nameMatch[1]));
                //adds it as retention index
                spectra.meta.push({ name: 'Retention Index', value: this.trim(nameMatch[2]), category: this.findCategory('Retention Index') });
            }
            else if (nameCombinedWithInstruments) {
                spectra.names.push(this.trim(nameCombinedWithInstruments[1]));
            }
            else {
                spectra.name = this.trim(value);
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
        this.handleMetaDataField = (value, spectra, regex, category) => {
            if (!category) {
                category = "none";
            }
            const extractValue = regex;
            let match = extractValue.exec(value);
            while (match != null) {
                const name = this.trim(match[1]);
                const parsedValue = this.trim(match[2]);
                if (this.ignoreField(name, parsedValue) == false) {
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
        this.trim = (str) => {
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
        this.inspectFields = (match, spectra) => {
            const regexInchIKey = /.*([A-Z]{14}-[A-Z]{10}-[A-Z,0-9])+.*/;
            //var regexSmiles = /^([^J][0-9BCOHNSOPrIFla@+\-\[\]\(\)\\\/%=#$,.~&!]{6,})$/;
            const regexSmiles = /^([^J][0-9A-Za-z@+\-\[\]\(\)\\\/%=#$,.~&!]{6,})$/;
            //if we contain an inchi key in any propterty of this field
            if (regexInchIKey.exec(match[2])) {
                spectra.inchiKey = regexInchIKey.exec(match[2])[1];
            }
            //get an inchi
            else if (match[1].toLowerCase() == 'inchi' || match[1].toLowerCase() == 'inchicode' || match[1].toLowerCase() == 'inchi code') {
                spectra.inchi = this.trim(match[2]);
            }
            //get an inchi from a smile
            else if (match[1].toLowerCase() == 'smiles' && regexSmiles.exec(match[2])) {
                spectra.smiles = regexSmiles.exec(match[2])[1];
            }
            //comment fields have quite often additional infomation in them
            else if (match[1].toLowerCase() === 'comment') {
                spectra = this.handleMetaDataField(match[2], spectra, /(\w+)\s*=\s*([0-9]*\.?[0-9]+)/g, undefined);
            }
            //can contain a lot of different id's in case of massbank generated msp files
            else if (match[1].toLowerCase() === 'searchid') {
                spectra = this.handleMetaDataField(match[2], spectra, /(\w+\s?\w*)+:\s*([\w\d]+[ \w\d-]+)/g, "Database Identifier");
            }
            //this mass bank special flag provides some derivatization information
            else if (match[1].toLowerCase() === 'ms$focused_ion') {
                spectra = this.handleMetaDataField(match[2], spectra, /\s*(.+):(.+)/g, "Derivatization");
            }
            //any other metadata field
            else {
                const name = match[1];
                const value = match[2];
                if (this.ignoreField(name, value) == false) {
                    //assign metadata
                    spectra.meta.push({
                        name: name,
                        value: value,
                        category: this.findCategory(name)
                    });
                }
            }
            return spectra;
        };
        /**
         * finds the related category for the given name, Will be an additional module at a later point TODO
         * @param name
         */
        this.findCategory = (name) => {
            name = name.toLocaleLowerCase();
            let category = "none";
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
        this.ignoreField = (name, value) => {
            if (this.trim(name) == '' || this.trim(value) == '') {
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
        this.convertWithCallback = (data, callback) => {
            this.logger.debug("starting with parsing new data set...");
            /**
             * checks for a complete block of mgf data.
             * @type {RegExp}
             */
            const blockRegEx = /BEGIN IONS([\s\S]*?)END IONS/g;
            /**
             * extracts the attributes like 'name' and 'value' from a found line
             * @type {RegExp}
             */
            const regExAttributes = /\s*([^=\s]+)=(.*)\s/g;
            /**
             * first block captures meta data
             * second block caputures spectra including floats
             * optional third block are identifications of this ion
             * @type {RegExp}
             */
            const regExSpectra = /^((?:0|[1-9]\d*)(?:\.\d*)?(?:[eE][+\-]?\d+)?)[ \t]((?:0|[1-9]\d*)(?:\.\d*)?(?:[eE][+\-]?\d+)?)[ \t]*(.+)?$/gm;
            /**
             * is this an accurate mass
             * @type {RegExp}
             */
            const regExAccurateMass = /(\d*\.?\d{3,})/;
            const buf = data.toString('utf8');
            let block, match;
            //go over all available blocks
            while ((block = blockRegEx.exec(buf)) != null) {
                block = block[1];
                //contains the resulting spectrum object
                let spectrum = { meta: [], names: [], name: '', spectrum: '', accurate: false };
                //parse attributes and metadata
                while ((match = regExAttributes.exec(block)) != null) {
                    if (match[1].toLowerCase() === 'name') {
                        //in case there are RI encoded we extract this information
                        spectrum = this.handleName(match[2], spectrum);
                    }
                    else {
                        spectrum = this.inspectFields(match, spectrum);
                    }
                }
                //builds the actual spectrum
                spectrum.accurate = true;
                let ions = [];
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
                        spectrum.meta.push({ name: this.trim(match[3]), value: match[1], category: 'annotation' });
                    }
                }
                //join ions to create spectrum string
                spectrum.spectrum = ions.join(' ');
                //make sure we have at least a spectrum and a name
                if (spectrum.spectrum != '') {
                    callback(spectrum);
                }
                else {
                    this.logger.warn('invalid spectrum found -> ignored');
                }
            }
        };
        this.convertFromData = (data, callback) => {
            return this.convertWithCallback(data, callback);
        };
        /**
         * counts the number of mass spectra in this library file
         * @param data
         * @returns {number}
         */
        this.countSpectra = (data) => {
            let count = 0;
            let pos = data.indexOf('BEGIN IONS', 0);
            while (pos != -1) {
                count++;
                pos = data.indexOf('BEGIN IONS', pos + 1);
            }
            return count;
        };
    }
}
MgfParserLibService.ɵfac = function MgfParserLibService_Factory(t) { return new (t || MgfParserLibService)(i0.ɵɵinject(NGXLogger)); };
MgfParserLibService.ɵprov = i0.ɵɵdefineInjectable({ token: MgfParserLibService, factory: MgfParserLibService.ɵfac, providedIn: 'root' });
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(MgfParserLibService, [{
        type: Injectable,
        args: [{
                providedIn: 'root'
            }]
    }], function () { return [{ type: i1.NGXLogger, decorators: [{
                type: Inject,
                args: [NGXLogger]
            }] }]; }, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWdmLXBhcnNlci1saWIuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIvaG9tZS9ub2xhbi9EZXZlbG9wbWVudC9tb25hLXNlcnZpY2VzL2FuZ3VsYXItbWdmLXBhcnNlci9wcm9qZWN0cy9tZ2YtcGFyc2VyLWxpYi9zcmMvIiwic291cmNlcyI6WyJsaWIvbWdmLXBhcnNlci1saWIuc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNuRCxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sWUFBWSxDQUFDOzs7QUFLckMsTUFBTSxPQUFPLG1CQUFtQjtJQUU5QixZQUF1QyxNQUFpQjtRQUFqQixXQUFNLEdBQU4sTUFBTSxDQUFXO1FBRXhEOzs7OztXQUtHO1FBQ0gsZUFBVSxHQUFHLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBRTlCLHNEQUFzRDtZQUN0RCxNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzVDLE1BQU0sMkJBQTJCLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRXBFLElBQUksU0FBUyxFQUFFO2dCQUNiLG1CQUFtQjtnQkFDbkIsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUU1Qyw0QkFBNEI7Z0JBQzVCLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUNmLEVBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLEVBQUMsQ0FDMUcsQ0FBQTthQUNGO2lCQUFNLElB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Q0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDcEMsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2xELENBQUMsQ0FBQztRQUVGOzs7O1dBSUc7UUFDSCxpQkFBWSxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDdEIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBQ2QsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFeEMsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUU7Z0JBQ2hCLEtBQUssRUFBRSxDQUFDO2dCQUNSLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7YUFDM0M7WUFFRCxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUMsQ0FBQztJQXZUMEQsQ0FBQzs7c0ZBRmxELG1CQUFtQixjQUVWLFNBQVM7MkRBRmxCLG1CQUFtQixXQUFuQixtQkFBbUIsbUJBRmxCLE1BQU07a0RBRVAsbUJBQW1CO2NBSC9CLFVBQVU7ZUFBQztnQkFDVixVQUFVLEVBQUUsTUFBTTthQUNuQjs7c0JBR2MsTUFBTTt1QkFBQyxTQUFTIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSW5qZWN0YWJsZSwgSW5qZWN0IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge05HWExvZ2dlcn0gZnJvbSBcIm5neC1sb2dnZXJcIjtcblxuQEluamVjdGFibGUoe1xuICBwcm92aWRlZEluOiAncm9vdCdcbn0pXG5leHBvcnQgY2xhc3MgTWdmUGFyc2VyTGliU2VydmljZSB7XG5cbiAgY29uc3RydWN0b3IoQEluamVjdChOR1hMb2dnZXIpIHByaXZhdGUgbG9nZ2VyOiBOR1hMb2dnZXIpIHsgfVxuXG4gIC8qKlxuICAgKiBwYXJzZXMgdGhlIG5hbWUgZmllbGQgY29udGVudCBhbmQgbW9kaWZpZXMgdGhlIHNwZWN0cmEgb2JqZWN0IGFjY29yZGluZ2x5XG4gICAqIEBwYXJhbSB2YWx1ZVxuICAgKiBAcGFyYW0gc3BlY3RyYU9iamVjdFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGhhbmRsZU5hbWUgPSAodmFsdWUsIHNwZWN0cmEpID0+IHtcblxuICAgIC8vY2hlY2sgaWYgd2UgaGF2ZSBhIFJldGVudGlvbiBJbmRleCBpbiB0aGUgbmFtZSBmaWVsZFxuICAgIGNvbnN0IG5hbWVNYXRjaCA9IC8oLispX1JJKC4qKS8uZXhlYyh2YWx1ZSk7XG4gICAgY29uc3QgbmFtZUNvbWJpbmVkV2l0aEluc3RydW1lbnRzID0gL1xccyooWzpcXHdcXGRcXHMtXSspOy8uZXhlYyh2YWx1ZSk7XG5cbiAgICBpZiAobmFtZU1hdGNoKSB7XG4gICAgICAvL3NldHMgdGhlIG5ldyBuYW1lXG4gICAgICBzcGVjdHJhLm5hbWVzLnB1c2godGhpcy50cmltKG5hbWVNYXRjaFsxXSkpO1xuXG4gICAgICAvL2FkZHMgaXQgYXMgcmV0ZW50aW9uIGluZGV4XG4gICAgICBzcGVjdHJhLm1ldGEucHVzaChcbiAgICAgICAge25hbWU6ICdSZXRlbnRpb24gSW5kZXgnLCB2YWx1ZTogdGhpcy50cmltKG5hbWVNYXRjaFsyXSksIGNhdGVnb3J5OiB0aGlzLmZpbmRDYXRlZ29yeSgnUmV0ZW50aW9uIEluZGV4Jyl9XG4gICAgICApXG4gICAgfSBlbHNlIGlmIChuYW1lQ29tYmluZWRXaXRoSW5zdHJ1bWVudHMpIHtcbiAgICAgIHNwZWN0cmEubmFtZXMucHVzaCh0aGlzLnRyaW0obmFtZUNvbWJpbmVkV2l0aEluc3RydW1lbnRzWzFdKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNwZWN0cmEubmFtZSA9IHRoaXMudHJpbSh2YWx1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNwZWN0cmFcbiAgfVxuXG4gIC8qKlxuICAgKiBoYW5kbGVzIGEgZ2l2ZW4gbWV0YWRhdGEgZmllbGQgYW5kIG1pZ2h0IGRvZXMgYWRkaXRpb25hbCBtb2RpZmNhdGlvbnNcbiAgICogQHBhcmFtIHZhbHVlXG4gICAqIEBwYXJhbSBzcGVjdHJhXG4gICAqIEBwYXJhbSByZWdleCByZWd1bGFyIGV4cHJlc3Npb24sIG11c3QgcHJvdmlkZSAyIGdyb3VwcyFcbiAgICogQHBhcmFtIGNhdGVnb3J5XG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgaGFuZGxlTWV0YURhdGFGaWVsZCA9ICh2YWx1ZSwgc3BlY3RyYSwgcmVnZXgsIGNhdGVnb3J5KSA9PiB7XG4gICAgaWYgKCFjYXRlZ29yeSkge1xuICAgICAgY2F0ZWdvcnkgPSBcIm5vbmVcIlxuICAgIH1cblxuICAgIGNvbnN0IGV4dHJhY3RWYWx1ZSA9IHJlZ2V4O1xuICAgIGxldCBtYXRjaCA9IGV4dHJhY3RWYWx1ZS5leGVjKHZhbHVlKTtcblxuICAgIHdoaWxlIChtYXRjaCAhPSBudWxsKSB7XG4gICAgICBjb25zdCBuYW1lID0gdGhpcy50cmltKG1hdGNoWzFdKTtcbiAgICAgIGNvbnN0IHBhcnNlZFZhbHVlID0gdGhpcy50cmltKG1hdGNoWzJdKTtcblxuICAgICAgaWYgKHRoaXMuaWdub3JlRmllbGQobmFtZSwgcGFyc2VkVmFsdWUpID09IGZhbHNlKSB7XG4gICAgICAgIHNwZWN0cmEubWV0YS5wdXNoKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6IG5hbWUsIHZhbHVlOiBwYXJzZWRWYWx1ZSwgY2F0ZWdvcnk6IGNhdGVnb3J5XG4gICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgbWF0Y2ggPSBleHRyYWN0VmFsdWUuZXhlYyh2YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiBzcGVjdHJhO1xuICB9XG5cbiAgLyoqXG4gICAqIHNpbXBsZSB0cmltbWluZyBmdW5jdGlvblxuICAgKi9cbiAgdHJpbSA9IChzdHIpID0+IHtcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHNcXHMqLywgJycpLnJlcGxhY2UoL1xcc1xccyokLywgJycpLnJlcGxhY2UoL15cIiguKilcIiQvLCAnJDEnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBpbnNwZWN0cyBvdXIgbWV0YWRhdGEgZmllbGRzIGFuZCBkb2VzIGFkZGl0aW9uYWwgbW9kaWZpY2F0aW9ucywgYXMgcmVxdWlyZWRcbiAgICogQHBhcmFtIG1hdGNoXG4gICAqIEBwYXJhbSBzcGVjdHJhXG4gICAqXG4gICAqXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgaW5zcGVjdEZpZWxkcyA9IChtYXRjaCwgc3BlY3RyYSkgPT4ge1xuICAgIGNvbnN0IHJlZ2V4SW5jaElLZXkgPSAvLiooW0EtWl17MTR9LVtBLVpdezEwfS1bQS1aLDAtOV0pKy4qLztcbiAgICAvL3ZhciByZWdleFNtaWxlcyA9IC9eKFteSl1bMC05QkNPSE5TT1BySUZsYUArXFwtXFxbXFxdXFwoXFwpXFxcXFxcLyU9IyQsLn4mIV17Nix9KSQvO1xuICAgIGNvbnN0IHJlZ2V4U21pbGVzID0gL14oW15KXVswLTlBLVphLXpAK1xcLVxcW1xcXVxcKFxcKVxcXFxcXC8lPSMkLC5+JiFdezYsfSkkLztcblxuICAgIC8vaWYgd2UgY29udGFpbiBhbiBpbmNoaSBrZXkgaW4gYW55IHByb3B0ZXJ0eSBvZiB0aGlzIGZpZWxkXG4gICAgaWYgKHJlZ2V4SW5jaElLZXkuZXhlYyhtYXRjaFsyXSkpIHtcbiAgICAgIHNwZWN0cmEuaW5jaGlLZXkgPSByZWdleEluY2hJS2V5LmV4ZWMobWF0Y2hbMl0pWzFdO1xuICAgIH1cblxuICAgIC8vZ2V0IGFuIGluY2hpXG4gICAgZWxzZSBpZiAobWF0Y2hbMV0udG9Mb3dlckNhc2UoKSA9PSAnaW5jaGknIHx8IG1hdGNoWzFdLnRvTG93ZXJDYXNlKCkgPT0gJ2luY2hpY29kZScgfHwgbWF0Y2hbMV0udG9Mb3dlckNhc2UoKSA9PSAnaW5jaGkgY29kZScpIHtcbiAgICAgIHNwZWN0cmEuaW5jaGkgPSB0aGlzLnRyaW0obWF0Y2hbMl0pO1xuICAgIH1cblxuICAgIC8vZ2V0IGFuIGluY2hpIGZyb20gYSBzbWlsZVxuICAgIGVsc2UgaWYgKG1hdGNoWzFdLnRvTG93ZXJDYXNlKCkgPT0gJ3NtaWxlcycgJiYgcmVnZXhTbWlsZXMuZXhlYyhtYXRjaFsyXSkpIHtcbiAgICAgIHNwZWN0cmEuc21pbGVzID0gcmVnZXhTbWlsZXMuZXhlYyhtYXRjaFsyXSlbMV07XG4gICAgfVxuXG4gICAgLy9jb21tZW50IGZpZWxkcyBoYXZlIHF1aXRlIG9mdGVuIGFkZGl0aW9uYWwgaW5mb21hdGlvbiBpbiB0aGVtXG4gICAgZWxzZSBpZiAobWF0Y2hbMV0udG9Mb3dlckNhc2UoKSA9PT0gJ2NvbW1lbnQnKSB7XG4gICAgICBzcGVjdHJhID0gdGhpcy5oYW5kbGVNZXRhRGF0YUZpZWxkKG1hdGNoWzJdLCBzcGVjdHJhLCAvKFxcdyspXFxzKj1cXHMqKFswLTldKlxcLj9bMC05XSspL2csIHVuZGVmaW5lZCk7XG4gICAgfVxuXG4gICAgLy9jYW4gY29udGFpbiBhIGxvdCBvZiBkaWZmZXJlbnQgaWQncyBpbiBjYXNlIG9mIG1hc3NiYW5rIGdlbmVyYXRlZCBtc3AgZmlsZXNcbiAgICBlbHNlIGlmIChtYXRjaFsxXS50b0xvd2VyQ2FzZSgpID09PSAnc2VhcmNoaWQnKSB7XG4gICAgICBzcGVjdHJhID0gdGhpcy5oYW5kbGVNZXRhRGF0YUZpZWxkKG1hdGNoWzJdLCBzcGVjdHJhLCAvKFxcdytcXHM/XFx3KikrOlxccyooW1xcd1xcZF0rWyBcXHdcXGQtXSspL2csIFwiRGF0YWJhc2UgSWRlbnRpZmllclwiKTtcbiAgICB9XG4gICAgLy90aGlzIG1hc3MgYmFuayBzcGVjaWFsIGZsYWcgcHJvdmlkZXMgc29tZSBkZXJpdmF0aXphdGlvbiBpbmZvcm1hdGlvblxuICAgIGVsc2UgaWYgKG1hdGNoWzFdLnRvTG93ZXJDYXNlKCkgPT09ICdtcyRmb2N1c2VkX2lvbicpIHtcbiAgICAgIHNwZWN0cmEgPSB0aGlzLmhhbmRsZU1ldGFEYXRhRmllbGQobWF0Y2hbMl0sIHNwZWN0cmEsIC9cXHMqKC4rKTooLispL2csIFwiRGVyaXZhdGl6YXRpb25cIik7XG4gICAgfVxuICAgIC8vYW55IG90aGVyIG1ldGFkYXRhIGZpZWxkXG4gICAgZWxzZSB7XG4gICAgICBjb25zdCBuYW1lID0gbWF0Y2hbMV07XG4gICAgICBjb25zdCB2YWx1ZSA9IG1hdGNoWzJdO1xuXG4gICAgICBpZiAodGhpcy5pZ25vcmVGaWVsZChuYW1lLCB2YWx1ZSkgPT0gZmFsc2UpIHtcbiAgICAgICAgLy9hc3NpZ24gbWV0YWRhdGFcbiAgICAgICAgc3BlY3RyYS5tZXRhLnB1c2goXG4gICAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgIGNhdGVnb3J5OiB0aGlzLmZpbmRDYXRlZ29yeShuYW1lKVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3BlY3RyYTtcbiAgfVxuXG4gIC8qKlxuICAgKiBmaW5kcyB0aGUgcmVsYXRlZCBjYXRlZ29yeSBmb3IgdGhlIGdpdmVuIG5hbWUsIFdpbGwgYmUgYW4gYWRkaXRpb25hbCBtb2R1bGUgYXQgYSBsYXRlciBwb2ludCBUT0RPXG4gICAqIEBwYXJhbSBuYW1lXG4gICAqL1xuICBmaW5kQ2F0ZWdvcnkgPSAobmFtZSkgPT4ge1xuICAgIG5hbWUgPSBuYW1lLnRvTG9jYWxlTG93ZXJDYXNlKCk7XG5cbiAgICBsZXQgY2F0ZWdvcnkgPSBcIm5vbmVcIjtcblxuICAgIC8vbWFzc3BlY3RyYWwgcHJvcGVydGllc1xuICAgIGlmIChuYW1lID09PSAnJykge1xuXG4gICAgfVxuXG4gICAgZWxzZSBpZiAobmFtZSA9PT0gJ3JldGVudGlvbmluZGV4JyB8fCBuYW1lID09PSAncmV0ZW50aW9uIGluZGV4JyB8fFxuICAgICAgbmFtZSA9PT0gJ3JldGVudGlvbnRpbWUnIHx8IG5hbWUgPT09ICdyZXRlbnRpb24gdGltZScpIHtcbiAgICAgIGNhdGVnb3J5ID0gXCJzcGVjdHJhbCBwcm9wZXJ0aWVzXCI7XG4gICAgfVxuXG4gICAgLy9hcXVpc2l0aW9uIHByb3BlcnRpZXNcbiAgICBlbHNlIGlmIChuYW1lID09PSAnaW5zdHJ1bWVudCcgfHwgbmFtZSA9PT0gJ2luc3RydW1lbnR0eXBlJyB8fCBuYW1lID09ICdpb25tb2RlJyB8fCBuYW1lID09ICdwcmVjdXJzb3JteicpIHtcbiAgICAgIGNhdGVnb3J5ID0gXCJhY3F1aXNpdGlvbiBwcm9wZXJ0aWVzXCI7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNhdGVnb3J5XG4gIH1cblxuICAvKipcbiAgICogaWdub3JlcyBhIGdpdmVuIGZpZWxkLCBpZiBhIGNlcnRhaW4gdmFsdWUgaXMgbm90IGFzIGV4c3BlY3RlZC4gV2lsbCBiZSBhbiBhZGRpdGlvbmFsIG1vZHVsZSBhdCBhIGxhdGVyIHBvaW50IFRPRE9cbiAgICogQHBhcmFtIG5hbWVcbiAgICogQHBhcmFtIHZhbHVlXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgaWdub3JlRmllbGQgPSAobmFtZSwgdmFsdWUpID0+IHtcblxuICAgIGlmICh0aGlzLnRyaW0obmFtZSkgPT0gJycgfHwgdGhpcy50cmltKHZhbHVlKSA9PSAnJykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgbmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcblxuICAgIGlmIChuYW1lID09IFwicmV0ZW50aW9udGltZVwiICYmIHZhbHVlIDw9IDApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBlbHNlIGlmIChuYW1lID09IFwicmV0ZW50aW9uaW5kZXhcIiAmJiB2YWx1ZSA8PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy9pZiAwLCBpdCBkb2Vzbid0IGNvdW50XG4gICAgZWxzZSBpZiAoKG5hbWUgPT09IFwicHJlY3Vyc29ybXpcIiB8fCBuYW1lID09PSBcImRlcml2YXRpdmVfbWFzc1wiIHx8IG5hbWUgPT09ICdwYXJlbnQnKSAmJiB2YWx1ZSA8PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy93ZSBnZXQgdGhpcyBvdmVyIHRoZSBpbmNoaSBrZXlcbiAgICBlbHNlIGlmIChuYW1lID09IFwiZm9ybXVsYVwiKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgZWxzZSBpZiAobmFtZSA9PSBcInN5bm9uXCIpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBlbHNlIGlmIChuYW1lID09IFwiaWRcIikge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogY29udmVydHMgdGhlIGRhdGEgdXNpbmcgYSBjYWxsYmFja1xuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICovXG4gIGNvbnZlcnRXaXRoQ2FsbGJhY2sgPSAoZGF0YSwgY2FsbGJhY2spID0+IHtcblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKFwic3RhcnRpbmcgd2l0aCBwYXJzaW5nIG5ldyBkYXRhIHNldC4uLlwiKTtcblxuICAgIC8qKlxuICAgICAqIGNoZWNrcyBmb3IgYSBjb21wbGV0ZSBibG9jayBvZiBtZ2YgZGF0YS5cbiAgICAgKiBAdHlwZSB7UmVnRXhwfVxuICAgICAqL1xuICAgIGNvbnN0IGJsb2NrUmVnRXggPSAvQkVHSU4gSU9OUyhbXFxzXFxTXSo/KUVORCBJT05TL2c7XG5cbiAgICAvKipcbiAgICAgKiBleHRyYWN0cyB0aGUgYXR0cmlidXRlcyBsaWtlICduYW1lJyBhbmQgJ3ZhbHVlJyBmcm9tIGEgZm91bmQgbGluZVxuICAgICAqIEB0eXBlIHtSZWdFeHB9XG4gICAgICovXG4gICAgY29uc3QgcmVnRXhBdHRyaWJ1dGVzID0gL1xccyooW149XFxzXSspPSguKilcXHMvZztcblxuICAgIC8qKlxuICAgICAqIGZpcnN0IGJsb2NrIGNhcHR1cmVzIG1ldGEgZGF0YVxuICAgICAqIHNlY29uZCBibG9jayBjYXB1dHVyZXMgc3BlY3RyYSBpbmNsdWRpbmcgZmxvYXRzXG4gICAgICogb3B0aW9uYWwgdGhpcmQgYmxvY2sgYXJlIGlkZW50aWZpY2F0aW9ucyBvZiB0aGlzIGlvblxuICAgICAqIEB0eXBlIHtSZWdFeHB9XG4gICAgICovXG4gICAgY29uc3QgcmVnRXhTcGVjdHJhID0gL14oKD86MHxbMS05XVxcZCopKD86XFwuXFxkKik/KD86W2VFXVsrXFwtXT9cXGQrKT8pWyBcXHRdKCg/OjB8WzEtOV1cXGQqKSg/OlxcLlxcZCopPyg/OltlRV1bK1xcLV0/XFxkKyk/KVsgXFx0XSooLispPyQvZ207XG5cbiAgICAvKipcbiAgICAgKiBpcyB0aGlzIGFuIGFjY3VyYXRlIG1hc3NcbiAgICAgKiBAdHlwZSB7UmVnRXhwfVxuICAgICAqL1xuICAgIGNvbnN0IHJlZ0V4QWNjdXJhdGVNYXNzID0gLyhcXGQqXFwuP1xcZHszLH0pLztcblxuICAgIGNvbnN0IGJ1ZiA9IGRhdGEudG9TdHJpbmcoJ3V0ZjgnKTtcblxuICAgIGxldCBibG9jaywgbWF0Y2g7XG5cbiAgICAvL2dvIG92ZXIgYWxsIGF2YWlsYWJsZSBibG9ja3NcbiAgICB3aGlsZSAoKGJsb2NrID0gYmxvY2tSZWdFeC5leGVjKGJ1ZikpICE9IG51bGwpIHtcbiAgICAgIGJsb2NrID0gYmxvY2tbMV07XG5cbiAgICAgIC8vY29udGFpbnMgdGhlIHJlc3VsdGluZyBzcGVjdHJ1bSBvYmplY3RcbiAgICAgIGxldCBzcGVjdHJ1bSA9IHttZXRhOiBbXSwgbmFtZXM6IFtdLCBuYW1lOiAnJywgc3BlY3RydW06ICcnLCBhY2N1cmF0ZTogZmFsc2V9O1xuXG4gICAgICAvL3BhcnNlIGF0dHJpYnV0ZXMgYW5kIG1ldGFkYXRhXG4gICAgICB3aGlsZSAoKG1hdGNoID0gcmVnRXhBdHRyaWJ1dGVzLmV4ZWMoYmxvY2spKSAhPSBudWxsKSB7XG4gICAgICAgIGlmIChtYXRjaFsxXS50b0xvd2VyQ2FzZSgpID09PSAnbmFtZScpIHtcbiAgICAgICAgICAvL2luIGNhc2UgdGhlcmUgYXJlIFJJIGVuY29kZWQgd2UgZXh0cmFjdCB0aGlzIGluZm9ybWF0aW9uXG4gICAgICAgICAgc3BlY3RydW0gPSB0aGlzLmhhbmRsZU5hbWUobWF0Y2hbMl0sIHNwZWN0cnVtKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzcGVjdHJ1bSA9IHRoaXMuaW5zcGVjdEZpZWxkcyhtYXRjaCwgc3BlY3RydW0pO1xuICAgICAgICB9XG4gICAgICB9XG5cblxuICAgICAgLy9idWlsZHMgdGhlIGFjdHVhbCBzcGVjdHJ1bVxuICAgICAgc3BlY3RydW0uYWNjdXJhdGUgPSB0cnVlO1xuICAgICAgbGV0IGlvbnMgPSBbXTtcblxuICAgICAgd2hpbGUgKChtYXRjaCA9IHJlZ0V4U3BlY3RyYS5leGVjKGJsb2NrKSkgIT0gbnVsbCkge1xuICAgICAgICAvLyBDb252ZXJ0IHNjaWVudGlmaWMgbm90YXRpb25cbiAgICAgICAgaWYgKG1hdGNoWzFdLnRvTG93ZXJDYXNlKCkuaW5kZXhPZignZScpID4gLTEpIHtcbiAgICAgICAgICBtYXRjaFsxXSA9IHBhcnNlRmxvYXQobWF0Y2hbMV0pLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1hdGNoWzJdLnRvTG93ZXJDYXNlKCkuaW5kZXhPZignZScpID4gLTEpIHtcbiAgICAgICAgICBtYXRjaFsyXSA9IHBhcnNlRmxvYXQobWF0Y2hbMl0pLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpb25zLnB1c2gobWF0Y2hbMV0gKyBcIjpcIiArIG1hdGNoWzJdKTtcblxuICAgICAgICAvL3VzZWQgdG8gZGV0ZXJtaW5lIGlmIHRoaXMgaXMgYW4gYWNjdXJhdGUgbWFzcyBzcGVjdHJ1bSBvciBub3RcbiAgICAgICAgaWYgKCFyZWdFeEFjY3VyYXRlTWFzcy50ZXN0KG1hdGNoWzFdKSkge1xuICAgICAgICAgIHNwZWN0cnVtLmFjY3VyYXRlID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvL2FkZCBhbm5vdGF0aW9uIHRvIG1ldGFkYXRhIGlmIGRlZmluZWRcbiAgICAgICAgaWYgKG1hdGNoWzNdKSB7XG4gICAgICAgICAgc3BlY3RydW0ubWV0YS5wdXNoKHtuYW1lOiB0aGlzLnRyaW0obWF0Y2hbM10pLCB2YWx1ZTogbWF0Y2hbMV0sIGNhdGVnb3J5OiAnYW5ub3RhdGlvbid9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvL2pvaW4gaW9ucyB0byBjcmVhdGUgc3BlY3RydW0gc3RyaW5nXG4gICAgICBzcGVjdHJ1bS5zcGVjdHJ1bSA9IGlvbnMuam9pbignICcpO1xuXG5cbiAgICAgIC8vbWFrZSBzdXJlIHdlIGhhdmUgYXQgbGVhc3QgYSBzcGVjdHJ1bSBhbmQgYSBuYW1lXG4gICAgICBpZiAoc3BlY3RydW0uc3BlY3RydW0gIT0gJycpIHtcbiAgICAgICAgY2FsbGJhY2soc3BlY3RydW0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybignaW52YWxpZCBzcGVjdHJ1bSBmb3VuZCAtPiBpZ25vcmVkJyk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIGNvbnZlcnRGcm9tRGF0YSA9ICAoZGF0YSwgY2FsbGJhY2spID0+IHtcbiAgICByZXR1cm4gdGhpcy5jb252ZXJ0V2l0aENhbGxiYWNrKGRhdGEsIGNhbGxiYWNrKTtcbiAgfTtcblxuICAvKipcbiAgICogY291bnRzIHRoZSBudW1iZXIgb2YgbWFzcyBzcGVjdHJhIGluIHRoaXMgbGlicmFyeSBmaWxlXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAqL1xuICBjb3VudFNwZWN0cmEgPSAoZGF0YSkgPT4ge1xuICAgIGxldCBjb3VudCA9IDA7XG4gICAgbGV0IHBvcyA9IGRhdGEuaW5kZXhPZignQkVHSU4gSU9OUycsIDApO1xuXG4gICAgd2hpbGUgKHBvcyAhPSAtMSkge1xuICAgICAgY291bnQrKztcbiAgICAgIHBvcyA9IGRhdGEuaW5kZXhPZignQkVHSU4gSU9OUycsIHBvcyArIDEpO1xuICAgIH1cblxuICAgIHJldHVybiBjb3VudDtcbiAgfTtcbn1cbiJdfQ==