// todo: iterate w/ <enquestion> to compile better and better questions

// todo: test w/ and w/o ponder, in integration test

export const thisPonderCatalog = {
  contextualize: [
    // human curated
    'what concept.dimensions are important to articulate for this specific goal?',
    'which <articulate>.tactics would help most for this goal?',
    'what granularity should it be articulated to?',

    // robot curated frame.1
    'who is this for?', // who is the audience?
    'why do they care?',
    'where will this be used?',
    'when is this relevant?',
    'what constraints exist?', // what constraints or conditions shape this articulation?

    // robot curated frame.2
    'what is the setting or situation for this concept?',
    'what related concepts or materials already exist in this context?',
  ],
  conceptualize: [
    // robot curated frame.1
    'what exactly am I articulating?', // 'what is the central concept or claim to convey?',
    'what is the goal of this articulation?',
    'what is the core message or takeaway?',
    'what level of acuity is needed?',
    'what gaps must be addressed?', // what misconceptions or gaps should be addressed?

    // robot curated frame.2
    'what qualities or attributes must be surfaced?',
    'what scope boundaries should be maintained?',
    'what misconceptions should be addressed?',

    // robot curated frame.3
    'what sub-points or dimensions does it naturally break into?',
    'what terms or concepts must be defined for clarity?',
    'what real-world examples or analogies will anchor it?',
  ],
};
