import { RoleRegistry } from '../../../__nonpublished_modules__/rhachet/src/domain/RoleRegistry';
import { EXAMPLE_REGISTRY } from './example.echoRegistry';

export const getRoleRegistries = async (): Promise<RoleRegistry[]> => {
  return [EXAMPLE_REGISTRY];
};
