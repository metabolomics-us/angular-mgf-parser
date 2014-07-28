/**
 * Created by Gert on 6/16/2014.
 */
describe('gwMgfService test', function () {

    describe('when I call gwMgfService.convert', function () {
        beforeEach(module('wohlgemuth.mgf.parser'));

        /**
         * Read data from massbank record files and return via callback
         */
        var readFile = function(filename, gwMgfService, callback) {
            var fileReader = new XMLHttpRequest();

            // For some reason, karma places all served data in /base/
            fileReader.open('GET', '/base/test_data/'+ filename, false);

            fileReader.onreadystatechange = function() {
                gwMgfService.convertFromData(fileReader.responseText, callback);
            };

            fileReader.send();
        };

        it('should parse mgf data from Doerrstein MS/MS library', inject(function (gwMgfService) {
            readFile('test.mgf', gwMgfService, function(data) {
                var metadataNames = [];
                for(var i = 0; i < data.meta.length; i++) {
                    metadataNames.push(data.meta[i].name);
                }

                expect(data.meta.length).toBeGreaterThan(0);
                expect(metadataNames.indexOf('INSTRUMENT')).toBeGreaterThan(-1);
                expect(metadataNames.indexOf('INCHI')).toBeGreaterThan(-1);
                expect(metadataNames.indexOf('SMILES')).toBeGreaterThan(-1);
                expect(metadataNames.indexOf('MSLEVEL')).toBeGreaterThan(-1);
                expect(metadataNames.indexOf('FILENAME')).toBeGreaterThan(-1);
                expect(data.spectrum).toBeDefined();
            });
        }));
    });
});