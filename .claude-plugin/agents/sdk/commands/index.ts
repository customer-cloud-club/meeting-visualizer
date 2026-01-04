/**
 * CCAGI SDK Commands Module
 *
 * Based on SDK_REQUIREMENTS.md v6.19.0
 * Exports all command handlers, registry, and utilities
 */

// Types
export * from './types';

// Base handler
export { BaseCommandHandler, consoleLogger, noopProgress, consoleProgress } from './base';

// Registry
export {
  getCommandRegistry,
  registerCommand,
  getCommandHandler,
  getPhaseHandlers,
  validateRegistry,
} from './registry';

// Phase 1: Requirements
import {
  GenerateRequirementsHandler as _GenReq,
  AddRequirementsHandler as _AddReq,
  registerPhase1Handlers as _regP1,
  getPhase1Handlers as _getP1,
} from './handlers/phase1-requirements';
export {
  _GenReq as GenerateRequirementsHandler,
  _AddReq as AddRequirementsHandler,
  _regP1 as registerPhase1Handlers,
  _getP1 as getPhase1Handlers,
};

// Phase 2: Design
import {
  GenerateSequenceDiagramHandler as _GenSeq,
  GenerateArchitectureDiagramHandler as _GenArch,
  GenerateDataflowDiagramHandler as _GenDF,
  GenerateUnitTestDesignHandler as _GenUT,
  GenerateIntegrationTestDesignHandler as _GenIT,
  GenerateGUITestDesignHandler as _GenGUI,
  GenerateE2ETestDesignHandler as _GenE2E,
  registerPhase2Handlers as _regP2,
  getPhase2Handlers as _getP2,
} from './handlers/phase2-design';
export {
  _GenSeq as GenerateSequenceDiagramHandler,
  _GenArch as GenerateArchitectureDiagramHandler,
  _GenDF as GenerateDataflowDiagramHandler,
  _GenUT as GenerateUnitTestDesignHandler,
  _GenIT as GenerateIntegrationTestDesignHandler,
  _GenGUI as GenerateGUITestDesignHandler,
  _GenE2E as GenerateE2ETestDesignHandler,
  _regP2 as registerPhase2Handlers,
  _getP2 as getPhase2Handlers,
};

// Phase 3: Planning
import {
  PlanProjectHandler as _PlanProj,
  OptimizeResourcesHandler as _OptRes,
  registerPhase3Handlers as _regP3,
  getPhase3Handlers as _getP3,
} from './handlers/phase3-planning';
export {
  _PlanProj as PlanProjectHandler,
  _OptRes as OptimizeResourcesHandler,
  _regP3 as registerPhase3Handlers,
  _getP3 as getPhase3Handlers,
};

// Phase 4: Implementation
import {
  ImplementAppHandler as _ImplApp,
  OptimizeDesignHandler as _OptDes,
  registerPhase4Handlers as _regP4,
  getPhase4Handlers as _getP4,
} from './handlers/phase4-implementation';
export {
  _ImplApp as ImplementAppHandler,
  _OptDes as OptimizeDesignHandler,
  _regP4 as registerPhase4Handlers,
  _getP4 as getPhase4Handlers,
};

// Phase 5: Testing
import {
  RunUnitTestsHandler as _RunUT,
  RunIntegrationTestsHandler as _RunIT,
  RunGUITestsHandler as _RunGUI,
  RunE2ETestsHandler as _RunE2E,
  registerPhase5Handlers as _regP5,
  getPhase5Handlers as _getP5,
} from './handlers/phase5-testing';
export {
  _RunUT as RunUnitTestsHandler,
  _RunIT as RunIntegrationTestsHandler,
  _RunGUI as RunGUITestsHandler,
  _RunE2E as RunE2ETestsHandler,
  _regP5 as registerPhase5Handlers,
  _getP5 as getPhase5Handlers,
};

// Phase 6: Documentation
import {
  GenerateUserManualHandler as _GenUM,
  GenerateDemoScenarioHandler as _GenDemo,
  GenerateTestAccountsHandler as _GenAcct,
  GenerateTestDataHandler as _GenData,
  registerPhase6Handlers as _regP6,
  getPhase6Handlers as _getP6,
} from './handlers/phase6-documentation';
export {
  _GenUM as GenerateUserManualHandler,
  _GenDemo as GenerateDemoScenarioHandler,
  _GenAcct as GenerateTestAccountsHandler,
  _GenData as GenerateTestDataHandler,
  _regP6 as registerPhase6Handlers,
  _getP6 as getPhase6Handlers,
};

// Phase 7: Deployment
import {
  VerifyBeforeDeployHandler as _VerDep,
  SetupInfrastructureHandler as _SetInfra,
  SetupPipelineHandler as _SetPipe,
  DeployDevHandler as _DepDev,
  DeployProdHandler as _DepProd,
  registerPhase7Handlers as _regP7,
  getPhase7Handlers as _getP7,
} from './handlers/phase7-deployment';
export {
  _VerDep as VerifyBeforeDeployHandler,
  _SetInfra as SetupInfrastructureHandler,
  _SetPipe as SetupPipelineHandler,
  _DepDev as DeployDevHandler,
  _DepProd as DeployProdHandler,
  _regP7 as registerPhase7Handlers,
  _getP7 as getPhase7Handlers,
};

// Phase 8: Platform Integration (v6.16.0+)
import {
  IntegratePlatformSDKHandler as _IntSDK,
  TestAuthIntegrationHandler as _TestAuth,
  TestBillingFlowHandler as _TestBill,
  SetupPlatformAuthHandler as _SetAuth,
  SetupPlatformBillingHandler as _SetBill,
  VerifyEntitlementsHandler as _VerEnt,
  registerPhase8Handlers as _regP8,
  getPhase8Handlers as _getP8,
} from './handlers/phase8-platform';
export {
  _IntSDK as IntegratePlatformSDKHandler,
  _TestAuth as TestAuthIntegrationHandler,
  _TestBill as TestBillingFlowHandler,
  _SetAuth as SetupPlatformAuthHandler,
  _SetBill as SetupPlatformBillingHandler,
  _VerEnt as VerifyEntitlementsHandler,
  _regP8 as registerPhase8Handlers,
  _getP8 as getPhase8Handlers,
};

// =============================================================================
// Registration Helper
// =============================================================================

/**
 * Register all command handlers
 */
export function registerAllHandlers(): void {
  _regP1();
  _regP2();
  _regP3();
  _regP4();
  _regP5();
  _regP6();
  _regP7();
  _regP8();
}

/**
 * Get all handlers grouped by phase
 */
export function getAllHandlers() {
  return {
    phase1: _getP1(),
    phase2: _getP2(),
    phase3: _getP3(),
    phase4: _getP4(),
    phase5: _getP5(),
    phase6: _getP6(),
    phase7: _getP7(),
    phase8: _getP8(),
  };
}

/**
 * Get total handler count
 */
export function getHandlerCount(): number {
  const all = getAllHandlers();
  return Object.values(all).reduce((sum, handlers) => sum + handlers.length, 0);
}
