import * as guards from '../guards';

const OBJECT_GUARDS = [
  guards.isCommand,
  guards.isCommandPreRun,
  guards.isStarterManifest,
  guards.isCordovaPackageJson,
  guards.isExitCodeException,
  guards.isSuperAgentError,
  guards.isAPIResponseSuccess,
  guards.isAPIResponseError,
  guards.isOrg,
  guards.isGithubRepo,
  guards.isGithubBranch,
  guards.isGithubRepoListResponse,
  guards.isGithubBranchListResponse,
  guards.isAppAssociation,
  guards.isAppAssociationResponse,
  guards.isGithubRepoAssociation,
  guards.isBitbucketCloudRepoAssociation,
  guards.isBitbucketServerRepoAssociation,
  guards.isApp,
  guards.isAppResponse,
  guards.isAppsResponse,
  guards.isOAuthLogin,
  guards.isOAuthLoginResponse,
  guards.isSnapshot,
  guards.isSnapshotResponse,
  guards.isSnapshotListResponse,
  guards.isLogin,
  guards.isLoginResponse,
  guards.isUser,
  guards.isUserResponse,
  guards.isSSHKey,
  guards.isSSHKeyListResponse,
  guards.isSSHKeyResponse,
  guards.isSecurityProfile,
  guards.isSecurityProfileResponse,
  guards.isTreatableAilment,
  guards.isIntegrationName,
  guards.isProjectConfig,
  guards.isMultiProjectConfig,
];

const ALL_GUARDS = [...OBJECT_GUARDS];

const API_RESPONSE_SUCCESS_GUARDS = [
  guards.isGithubRepoListResponse,
  guards.isGithubBranchListResponse,
  guards.isAppAssociationResponse,
  guards.isAppResponse,
  guards.isAppsResponse,
  guards.isOAuthLoginResponse,
  guards.isSnapshotResponse,
  guards.isSnapshotListResponse,
  guards.isLoginResponse,
  guards.isUserResponse,
  guards.isSSHKeyResponse,
  guards.isSSHKeyListResponse,
  guards.isSecurityProfileResponse,
];

describe('ionic', () => {

  describe('guards', () => {

    describe('object guards', () => {

      it('should return false for non-object types', () => {
        const tests = [undefined, null, 0, 5, NaN, '', 'foobar', [], ['a', 'b', 'c']];

        for (const guard of OBJECT_GUARDS) {
          for (const test of tests) {
            const result = guard(test);

            // if (result) {
            //   debugger;
            // }

            expect(result).toBeFalsy();
          }
        }
      });

    });

    describe('api response success guards', () => {

      it('should return false for misshapen objects', () => {
        const tests = [{}, { data: {} }, { data: 'foobar' }];

        for (const guard of API_RESPONSE_SUCCESS_GUARDS) {
          for (const test of tests) {
            const result = guard(test);

            // if (result) {
            //   debugger;
            // }

            expect(result).toBeFalsy();
          }
        }
      });

    });

    // TODO: add more tests for guards

  });

});
