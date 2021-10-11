import { Injectable, Inject } from '@angular/core';
import {NGXLogger} from "ngx-logger";

@Injectable({
  providedIn: 'root'
})
export class MgfParserLibService {

  constructor(@Inject(NGXLogger) private logger: NGXLogger) { }

  /**
   * parses the name field content and modifies the spectra object accordingly
   * @param value
   * @param spectraObject
   * @returns {*}
   */
  handleName = (value, spectra) => {

    //check if we have a Retention Index in the name field
    const nameMatch = /(.+)_RI(.*)/.exec(value);
    const nameCombinedWithInstruments = /\s*([:\w\d\s-]+);/.exec(value);

    if (nameMatch) {
      //sets the new name
      spectra.names.push(this.trim(nameMatch[1]));

      //adds it as retention index
      spectra.meta.push(
        {name: 'Retention Index', value: this.trim(nameMatch[2]), category: this.findCategory('Retention Index')}
      )
    } else if (nameCombinedWithInstruments) {
      spectra.names.push(this.trim(nameCombinedWithInstruments[1]));
    } else {
      spectra.name = this.trim(value);
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
  handleMetaDataField = (value, spectra, regex, category) => {
    if (!category) {
      category = "none"
    }

    const extractValue = regex;
    let match = extractValue.exec(value);

    while (match != null) {
      const name = this.trim(match[1]);
      const parsedValue = this.trim(match[2]);

      if (this.ignoreField(name, parsedValue) == false) {
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
  trim = (str) => {
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '').replace(/^"(.*)"$/, '$1');
  }

  /**
   * inspects our metadata fields and does additional modifications, as required
   * @param match
   * @param spectra
   *
   *
   * @returns {*}
   */
  inspectFields = (match, spectra) => {
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
        spectra.meta.push(
          {
            name: name,
            value: value,
            category: this.findCategory(name)
          }
        );
      }
    }

    return spectra;
  }

  /**
   * finds the related category for the given name, Will be an additional module at a later point TODO
   * @param name
   */
  findCategory = (name) => {
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

    return category
  }

  /**
   * ignores a given field, if a certain value is not as exspected. Will be an additional module at a later point TODO
   * @param name
   * @param value
   * @returns {boolean}
   */
  ignoreField = (name, value) => {

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
      return true
    }

    return false;
  }

  /**
   * converts the data using a callback
   * @param data
   * @param callback
   */
  convertWithCallback = (data, callback) => {

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
      let spectrum = {meta: [], names: [], name: '', spectrum: '', accurate: false};

      //parse attributes and metadata
      while ((match = regExAttributes.exec(block)) != null) {
        if (match[1].toLowerCase() === 'name') {
          //in case there are RI encoded we extract this information
          spectrum = this.handleName(match[2], spectrum);
        } else {
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
          spectrum.meta.push({name: this.trim(match[3]), value: match[1], category: 'annotation'});
        }
      }

      //join ions to create spectrum string
      spectrum.spectrum = ions.join(' ');


      //make sure we have at least a spectrum and a name
      if (spectrum.spectrum != '') {
        callback(spectrum);
      } else {
        this.logger.warn('invalid spectrum found -> ignored');
      }
    }
  };

  convertFromData =  (data, callback) => {
    return this.convertWithCallback(data, callback);
  };

  /**
   * counts the number of mass spectra in this library file
   * @param data
   * @returns {number}
   */
  countSpectra = (data) => {
    let count = 0;
    let pos = data.indexOf('BEGIN IONS', 0);

    while (pos != -1) {
      count++;
      pos = data.indexOf('BEGIN IONS', pos + 1);
    }

    return count;
  };
}
