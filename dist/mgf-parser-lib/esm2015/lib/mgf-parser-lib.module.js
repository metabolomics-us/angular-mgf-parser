import { NgModule } from '@angular/core';
import { MgfParserLibService } from "./mgf-parser-lib.service";
import { LoggerModule, NgxLoggerLevel } from "ngx-logger";
import * as i0 from "@angular/core";
import * as i1 from "ngx-logger";
export class MgfParserLibModule {
}
MgfParserLibModule.ɵmod = i0.ɵɵdefineNgModule({ type: MgfParserLibModule });
MgfParserLibModule.ɵinj = i0.ɵɵdefineInjector({ factory: function MgfParserLibModule_Factory(t) { return new (t || MgfParserLibModule)(); }, providers: [
        MgfParserLibService
    ], imports: [[
            LoggerModule.forRoot({
                level: NgxLoggerLevel.DEBUG,
                serverLogLevel: NgxLoggerLevel.OFF
            })
        ]] });
(function () { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵɵsetNgModuleScope(MgfParserLibModule, { imports: [i1.LoggerModule] }); })();
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(MgfParserLibModule, [{
        type: NgModule,
        args: [{
                imports: [
                    LoggerModule.forRoot({
                        level: NgxLoggerLevel.DEBUG,
                        serverLogLevel: NgxLoggerLevel.OFF
                    })
                ],
                providers: [
                    MgfParserLibService
                ]
            }]
    }], null, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWdmLXBhcnNlci1saWIubW9kdWxlLmpzIiwic291cmNlUm9vdCI6Ii9ob21lL25vbGFuL0RldmVsb3BtZW50L21vbmEtc2VydmljZXMvYW5ndWxhci1tZ2YtcGFyc2VyL3Byb2plY3RzL21nZi1wYXJzZXItbGliL3NyYy8iLCJzb3VyY2VzIjpbImxpYi9tZ2YtcGFyc2VyLWxpYi5tb2R1bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN6QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvRCxPQUFPLEVBQUMsWUFBWSxFQUFFLGNBQWMsRUFBQyxNQUFNLFlBQVksQ0FBQzs7O0FBYXhELE1BQU0sT0FBTyxrQkFBa0I7O3NEQUFsQixrQkFBa0I7bUhBQWxCLGtCQUFrQixtQkFKbEI7UUFDVCxtQkFBbUI7S0FDcEIsWUFSUTtZQUNQLFlBQVksQ0FBQyxPQUFPLENBQUM7Z0JBQ25CLEtBQUssRUFBRSxjQUFjLENBQUMsS0FBSztnQkFDM0IsY0FBYyxFQUFFLGNBQWMsQ0FBQyxHQUFHO2FBQ25DLENBQUM7U0FDSDt3RkFLVSxrQkFBa0I7a0RBQWxCLGtCQUFrQjtjQVg5QixRQUFRO2VBQUM7Z0JBQ1IsT0FBTyxFQUFFO29CQUNQLFlBQVksQ0FBQyxPQUFPLENBQUM7d0JBQ25CLEtBQUssRUFBRSxjQUFjLENBQUMsS0FBSzt3QkFDM0IsY0FBYyxFQUFFLGNBQWMsQ0FBQyxHQUFHO3FCQUNuQyxDQUFDO2lCQUNIO2dCQUNELFNBQVMsRUFBRTtvQkFDVCxtQkFBbUI7aUJBQ3BCO2FBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZ01vZHVsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgTWdmUGFyc2VyTGliU2VydmljZSB9IGZyb20gXCIuL21nZi1wYXJzZXItbGliLnNlcnZpY2VcIjtcbmltcG9ydCB7TG9nZ2VyTW9kdWxlLCBOZ3hMb2dnZXJMZXZlbH0gZnJvbSBcIm5neC1sb2dnZXJcIjtcblxuQE5nTW9kdWxlKHtcbiAgaW1wb3J0czogW1xuICAgIExvZ2dlck1vZHVsZS5mb3JSb290KHtcbiAgICAgIGxldmVsOiBOZ3hMb2dnZXJMZXZlbC5ERUJVRyxcbiAgICAgIHNlcnZlckxvZ0xldmVsOiBOZ3hMb2dnZXJMZXZlbC5PRkZcbiAgICB9KVxuICBdLFxuICBwcm92aWRlcnM6IFtcbiAgICBNZ2ZQYXJzZXJMaWJTZXJ2aWNlXG4gIF1cbn0pXG5leHBvcnQgY2xhc3MgTWdmUGFyc2VyTGliTW9kdWxlIHsgfVxuIl19