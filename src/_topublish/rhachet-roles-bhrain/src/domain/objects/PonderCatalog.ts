import { TriageCatalog } from '../../../../domain-glossary-brief/src/domain/objects/TriageCatalog';
import { Question } from './Question';

/**
 * A PonderCatalog stores the triaged questions available for use in a ponder operation
 */
export type PonderCatalog = {
  contextualize: TriageCatalog<Question>;
  conceptualize: TriageCatalog<Question>;
};
