/**
 * .what = a trait which is adopted as an inherent truth of any agent which assumes the role
 * .why = defines the default mindset or behavioral axioms that persist across all tasks performed in the role
 * .cases =
 *   - treat ubiquitous language as top priority
 *   - treat consistency as top priority
 *   - prefer given/when/then test suites
 */
export interface RoleTrait {
  content: string;
}

/**
 * .what = a skill which is learned and accessible to any agent which assumes the role
 * .why = enables agents to perform tasks within the role using repeatable methods, patterns, or strategies
 * .cases =
 *   - domain distillation is a process where you extract domain terms and clarify their relationships; here's how to use
 *   - given/when/then enables test suites with behavior-driven structure; here's how to use
 */
export interface RoleSkill {
  content: string;
}

/**
 * .what = the context that each role carries with it
 * .why = provides each role with a set of traits (inherent truths) and skills (learned abilities) to influence how they approach decisions, actions, and interpretations
 *
 * todo = lift to be a primitive of rhachet itself
 */
export interface RoleContext {
  traits: RoleTrait[];
  skills: RoleSkill[];
}
