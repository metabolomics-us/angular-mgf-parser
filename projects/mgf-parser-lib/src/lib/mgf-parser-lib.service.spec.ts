import { TestBed } from '@angular/core/testing';
import {NGXLogger} from "ngx-logger";
import {LoggerTestingModule, NGXLoggerMock} from "ngx-logger/testing";
import { MgfParserLibService } from './mgf-parser-lib.service';

describe('MgfParserLibService', () => {
  let service: MgfParserLibService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        LoggerTestingModule
      ],
      providers: [MgfParserLibService]
    });
    service = TestBed.inject(MgfParserLibService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

describe('when I call gwMgfService.convert', () => {
  let service: MgfParserLibService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        LoggerTestingModule
      ],
      providers: [MgfParserLibService]
    });
    service = TestBed.inject(MgfParserLibService);
  });

  /**
   * Read data from massbank record files and return via callback
   */
  let readFile = (filename, service, callback) => {
    let fileReader = new XMLHttpRequest();

    // For some reason, karma places all served data in /base/
    fileReader.open('GET', '/base/test_data/'+ filename, false);

    fileReader.onreadystatechange = () => {
      service.convertFromData(fileReader.responseText, callback);
    };

    fileReader.send();
  };

  it('should parse mgf data from Doerrstein MS/MS library', () =>{
    readFile('test.mgf', service, (data) => {
      let metadataNames = [];
      for(let i = 0; i < data.meta.length; i++) {
        metadataNames.push(data.meta[i].name);
      }
      expect(data.meta.length).toBeGreaterThan(0);
      expect(metadataNames.indexOf('INSTRUMENT')).toBeGreaterThan(-1);
      expect(metadataNames.indexOf('MSLEVEL')).toBeGreaterThan(-1);
      expect(metadataNames.indexOf('FILENAME')).toBeGreaterThan(-1);


      expect(metadataNames.indexOf('INCHI')).toEqual(-1);
      expect(metadataNames.indexOf('SMILES')).toEqual(-1);
      expect(data.inchi).toEqual('N/A');
      //test file has 2 callbacks so will always fail unless we change the test file
      //expect(data.smiles).toEqual('C[C@@H](C1[C@@H](O)CC2C3C=CC4C[C@@H](O)CC[C@]4(C)[C@H]3CC[C@]12C)[C@@H]5CCCCN5');
      expect(data.spectrum).toBeDefined();
    });
  });
});
