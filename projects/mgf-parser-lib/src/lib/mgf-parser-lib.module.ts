import { NgModule } from '@angular/core';
import { MgfParserLibService } from "./mgf-parser-lib.service";
import {LoggerModule, NgxLoggerLevel} from "ngx-logger";

@NgModule({
  imports: [
    LoggerModule.forRoot({
      level: NgxLoggerLevel.DEBUG,
      serverLogLevel: NgxLoggerLevel.OFF
    })
  ],
  providers: [
    MgfParserLibService
  ]
})
export class MgfParserLibModule { }
