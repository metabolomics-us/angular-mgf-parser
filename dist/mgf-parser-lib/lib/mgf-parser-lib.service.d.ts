import { NGXLogger } from "ngx-logger";
import * as i0 from "@angular/core";
export declare class MgfParserLibService {
    private logger;
    constructor(logger: NGXLogger);
    /**
     * parses the name field content and modifies the spectra object accordingly
     * @param value
     * @param spectraObject
     * @returns {*}
     */
    handleName: (value: any, spectra: any) => any;
    /**
     * handles a given metadata field and might does additional modifcations
     * @param value
     * @param spectra
     * @param regex regular expression, must provide 2 groups!
     * @param category
     * @returns {*}
     */
    handleMetaDataField: (value: any, spectra: any, regex: any, category: any) => any;
    /**
     * simple trimming function
     */
    trim: (str: any) => any;
    /**
     * inspects our metadata fields and does additional modifications, as required
     * @param match
     * @param spectra
     *
     *
     * @returns {*}
     */
    inspectFields: (match: any, spectra: any) => any;
    /**
     * finds the related category for the given name, Will be an additional module at a later point TODO
     * @param name
     */
    findCategory: (name: any) => string;
    /**
     * ignores a given field, if a certain value is not as exspected. Will be an additional module at a later point TODO
     * @param name
     * @param value
     * @returns {boolean}
     */
    ignoreField: (name: any, value: any) => boolean;
    /**
     * converts the data using a callback
     * @param data
     * @param callback
     */
    convertWithCallback: (data: any, callback: any) => void;
    convertFromData: (data: any, callback: any) => void;
    /**
     * counts the number of mass spectra in this library file
     * @param data
     * @returns {number}
     */
    countSpectra: (data: any) => number;
    static ɵfac: i0.ɵɵFactoryDef<MgfParserLibService, never>;
    static ɵprov: i0.ɵɵInjectableDef<MgfParserLibService>;
}
//# sourceMappingURL=mgf-parser-lib.service.d.ts.map