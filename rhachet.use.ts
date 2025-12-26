import type { InvokeHooks, RoleRegistry } from 'rhachet';

import { getRoleRegistry as getRoleRegistryEhmpathy, getInvokeHooks as getInvokeHooksEhmpathy } from './dist/index.js';
import { getRoleRegistry as getRoleRegistryBhrain, getInvokeHooks as getInvokeHooksBhrain } from 'rhachet-roles-bhrain';
import { getRoleRegistry as getRoleRegistryBhuild, getInvokeHooks as getInvokeHooksBhuild } from 'rhachet-roles-bhuild';

export const getRoleRegistries = (): RoleRegistry[] => [getRoleRegistryEhmpathy(), getRoleRegistryBhrain(), getRoleRegistryBhuild()];
export const getInvokeHooks = (): InvokeHooks[] => [getInvokeHooksEhmpathy(), getInvokeHooksBhrain(), getInvokeHooksBhuild()];
