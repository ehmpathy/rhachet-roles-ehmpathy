# Changelog

## [1.13.8](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.13.7...v1.13.8) (2025-12-14)


### Bug Fixes

* **mechanic:** ensure claude permissions dont have trailing errors ([#33](https://github.com/ehmpathy/rhachet-roles-ehmpathy/issues/33)) ([2a5ba21](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/2a5ba2129316c6f13552c8a52de471714dcb2bc7))

## [1.13.7](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.13.6...v1.13.7) (2025-12-12)


### Bug Fixes

* **pkg:** recomplete the package with post tsc step ([#31](https://github.com/ehmpathy/rhachet-roles-ehmpathy/issues/31)) ([ded3b91](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/ded3b914eecbe9400506c49745d287277f97b5d1))

## [1.13.6](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.13.5...v1.13.6) (2025-12-12)


### Bug Fixes

* **cicd:** use npm oidc ([#29](https://github.com/ehmpathy/rhachet-roles-ehmpathy/issues/29)) ([aa175ec](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/aa175ec0f2feb7543ac4be85a9fb6904c486d0de))

## [1.13.5](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.13.4...v1.13.5) (2025-12-11)


### Bug Fixes

* **mechanic:** pretooluse nudge should eval prefixes and composites ([#27](https://github.com/ehmpathy/rhachet-roles-ehmpathy/issues/27)) ([9a53915](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/9a53915a179e49e3408d74f1d4f18c9e4de3ce9d))

## [1.13.4](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.13.3...v1.13.4) (2025-12-10)


### Bug Fixes

* **mechanic:** add mvsafe skill for claude.tools ([#25](https://github.com/ehmpathy/rhachet-roles-ehmpathy/issues/25)) ([27185b9](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/27185b9cd0b12e95c8037343dd8db63fe78d2242))

## [1.13.3](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.13.2...v1.13.3) (2025-12-08)


### Bug Fixes

* **pkg:** include non-tsc briefs and skills ([#23](https://github.com/ehmpathy/rhachet-roles-ehmpathy/issues/23)) ([a729372](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/a72937299396f0fb66fc6f3023e76a7bf7003c09))

## [1.13.2](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.13.1...v1.13.2) (2025-12-08)


### Bug Fixes

* **mechanic:** expand default permissions allowlist ([#21](https://github.com/ehmpathy/rhachet-roles-ehmpathy/issues/21)) ([0a18f38](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/0a18f380a5214bd17be57226e392bca5eacd4bb2))

## [1.13.1](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.13.0...v1.13.1) (2025-12-08)


### Bug Fixes

* **practs:** bump to latest best ([#19](https://github.com/ehmpathy/rhachet-roles-ehmpathy/issues/19)) ([5c73fdc](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/5c73fdc242d27fd76e358471ec092fb8fc88e4f1))

## [1.13.0](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.12.1...v1.13.0) (2025-12-07)


### Features

* **mechanic:** forbid stderr redirect hook ([a879e1a](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/a879e1a280e5ede3c5338d5399acc326c16808a4))


### Bug Fixes

* **mechanic:** backup settings.local.json on init.claude ([8a7871e](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/8a7871e597f2e1f165eab71233ee0b511ade6680))
* **mechanic:** expand default allow readonly perms ([06814d1](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/06814d110711416385fed6218cb3853e9f8a9181))
* **mechanic:** update mechanic claude permissions on init ([af81b26](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/af81b266581dd085b4117b2b02b893c09be35da5))

## [1.12.1](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.12.0...v1.12.1) (2025-12-07)


### Bug Fixes

* **nudge:** clarify exact match vs prefix match permissions in nudge ([113c428](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/113c428eef6709220ee8cc8bd20e3efa663dbb0d))
* **nudge:** match permissions via prefix match on claude hooks nudge ([80f5882](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/80f588283b18d2e9c0ba84308faa2141b9165bea))

## [1.12.0](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.11.0...v1.12.0) (2025-12-06)


### Features

* **mechanic:** add check.pretooluser.permissions hook ([cac9b15](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/cac9b15c3575d2655d25cc01cffffb218d34ed76))

## [1.11.0](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.10.0...v1.11.0) (2025-12-05)


### Features

* **mechanic:** add git.worktree skill ([616597b](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/616597bcb88af75639d9475ac953d14b37440bf5))

## [1.10.0](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.9.1...v1.10.0) (2025-12-05)


### Features

* **mechanic:** add init.bhuild.sh skill ([c7fe5e4](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/c7fe5e49c463772888bce246987170cdf315058c))
* **mechanic:** add skills/init.chaude.sh w/ init.claude.permissions + hooks ([18f3f67](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/18f3f674d0579fe0ebf1d394a46d02c924dc6881))


### Bug Fixes

* **mechanic:** bump run.test.sh skill to not emit colors into log file ([6adc7f1](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/6adc7f1a699f9c4123252c17ad1d00b538d91fc5))

## [1.9.1](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.9.0...v1.9.1) (2025-11-23)


### Bug Fixes

* **pkg:** ensure skills/**.sh are distributed ([f5fc775](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/f5fc77503866a533992fb62d45f204e9c8936cb6))

## [1.9.0](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.8.0...v1.9.0) (2025-11-23)


### Features

* **mechanic:** add skills to mechanic; also, append briefs ([a93ff4e](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/a93ff4e44ac296bbe7fa74bef8c1ecee150e939b))
* **mechanic:** gather more mechanic briefs ([14bbd6d](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/14bbd6db41684ad9fda8db02ec8e135f837b111b))
* **mechanic:** gather more mechanic briefs ([6e24ded](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/6e24dedfea3fb491959e274dc219640fc80dd92f))
* **mechanic:** gather more mechanic briefs ([69e9231](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/69e92316204c4e743ed06e41daf0db3bfafab962))
* **mechanic:** gather more mechanic briefs and skills ([2aeade2](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/2aeade25fe1701e79ec6dc82b30b65ccf35df855))
* **mechanic:** gather more mechanic briefs and skills ([c55a925](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/c55a92533ebf469cffe600f0c386a73188f84cf7))

## [1.8.0](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.7.0...v1.8.0) (2025-11-10)


### Features

* **architect:** expose architect role; also, bump to latest rhachet ([ee3f1a7](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/ee3f1a7859412a1a0fa7631ac89ebf48d79e1ecf))
* **briefs:** append mechanic and architect briefs ([72e7c81](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/72e7c816a45c05977fbab7ea268a96694e2833d6))

## [1.7.0](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.6.0...v1.7.0) (2025-11-02)


### Features

* **hooks:** support translate of paths relative to gitroot ([d0f6043](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/d0f6043c690b0d1d7e8bec01c88145514ecfd6d9))
* **mechanic:** add git commit mechanic tactic::skill ([8e1ffb2](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/8e1ffb2eb5324101f6c9b42e00a2b692b0e84139))


### Bug Fixes

* **cicd:** approve arch as a valid commmit prefix ([97252ea](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/97252eab63fa891142baef4866d8ee11344af0c2))
* **deps:** bump to latest rhachet version to support briefs ([f96531f](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/f96531f072787b39d524a5aa655556186013c587))

## [1.6.0](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.5.0...v1.6.0) (2025-10-07)


### Features

* **term:** add terminal.commander.exec skill ([94fd26a](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/94fd26a2d49dd31cde0d9983d3477c6b58b105eb))
* **term:** add terminal.commander.plan skill ([86289c9](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/86289c9d52caac28b33ef198ff1ff82193c565f1))


### Bug Fixes

* **tests:** resolve earlier unit test contract change ([a8b8587](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/a8b85875adcf6a55ab23b6467d08f05737c5cb76))

## [1.5.0](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.4.0...v1.5.0) (2025-09-29)


### Features

* **hooks:** add translate doc output path hook ([470b1da](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/470b1da472fe5e3dad2c38252c9e510ec18430f4))

## [1.4.0](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.3.0...v1.4.0) (2025-09-27)


### Features

* **skill:** enable --ref globs and --fresh for instantiate skill ([1129ad0](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/1129ad051691467931cd59a90573f6811271af7c))
* **skills:** emit .src file for subset of skills ([ff67fe6](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/ff67fe68ff5088f94a87dad83977861624705712))


### Bug Fixes

* **bhrain:** catalogize table format ([fa4d178](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/fa4d178905357e30807ea60e3ddff38f9c6658c8))
* **skills:** support glob in catalogize; optional fresh in instantiate ([96572cc](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/96572ccae4846bfcbb6543fe0ee857d5f230dfc6))

## [1.3.0](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.2.0...v1.3.0) (2025-09-12)


### Features

* **bhrain:** articulate traits. articulate trait gerund eliminator ([403fc0f](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/403fc0f47a32a0ca459fa7e5982ef741c09f08df))


### Bug Fixes

* **bhrain:** get template by caller path for triage and articulate; also, galactic metaphor ([35551f6](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/35551f6e498e0186714460d7a6b0178166425e40))
* **bhrain:** reliably load catelogize template for skill ([5667f71](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/5667f712c03f3f1d30c0c29871e11461c5ff4af8))
* **bhrain:** use --output instead of --target on articulate skill ([0ec8050](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/0ec8050feeda764ce83adf95c7bada1cf54a876f))
* **feedback:** omit feedback if in isolated attempt thread ([00dc100](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/00dc100c08bcad1296b5a265791302a602a372fd))

## [1.2.0](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.1.0...v1.2.0) (2025-09-03)


### Features

* **bhrain:** @[thinker]&lt;ponder&gt; ([29de172](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/29de1723627899aa60c33d07bb488a5f3f48d9e2))
* **bhrain:** add skill &lt;demonstrate&gt; ([780b530](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/780b530cb657edd59cabd2156aa315070f97480c))
* **bhrain:** articulate ([4a44635](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/4a4463558b61e694c397d55d23dc795ea8c0450b))
* **bhrain:** articulate tactical briefs ([76e2b27](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/76e2b2777caa9b9fcc0e4b49f6444ff9e590479c))
* **bhrain:** brief.articulate,.catalogize,.illustrate stubout ([38d60c2](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/38d60c22791fd4e4916217dd5f3c170b72885ad9))
* **bhrain:** catalogize via instantiate ([0047391](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/0047391b100cbd4222b9e4dfc66c30aff937eb81))
* **bhrain:** cortal.assemblylang ([177d874](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/177d874f352fc201332731e13871184478315b05))
* **bhrain:** declare initial ponder catalog for enquestion ([8fa10cf](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/8fa10cf3f19400d43e8f8d9d66cfc13d620e9c79))
* **bhrain:** demonstrate enskill ([8f7a0c5](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/8f7a0c559c198b7bb8ca33d2c6de351259b0a1f3))
* **bhrain:** enbrief kernelize ([44deac1](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/44deac120466b4edf67c64289134bb497cf92971))
* **bhrain:** enskill instantiate ([7bd734a](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/7bd734a64f03cf49aa77c151eab3dad627e519ea))
* **bhrain:** gather cognition briefs; questions, traversal, focus, concepts ([fb37e24](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/fb37e245ddf1fa1dc114c3ed60c4c7af8874ba84))
* **bhrain:** knowledge briefs ([1300753](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/1300753a659a1ed2543a92479f97807658a26e68))
* **bhrain:** learn to demonstrate ([3a8368b](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/3a8368b6fd1dade2c17a4fa1681849326db72a12))
* **bhrain:** learn to demonstrate, cont ([71a1377](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/71a1377767ce494bcd196a8da2bca6357c017a58))
* **bhrain:** loopArticulateWithPonder ([7ed6ecf](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/7ed6ecfc5e1763ea9978c44c9b28ea500467e0a0))
* **bhrain:** make skill cluster ([48a2fbb](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/48a2fbbf24232ff4427a38327b9bd58a7118371a))
* **bhrain:** make skill diverge ([c3f3a67](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/c3f3a6754df05b39c4665cd8f2b6de645fd7ce34))
* **bhrain:** make skill triage ([a6e9120](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/a6e9120e93287fc9607c658d8888a8ed7c006151))
* **bhrain:** polish &lt;articulate&gt; to consistent strength ([079bb1d](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/079bb1ddc6c7cbed6588bba01977722452e77b95))
* **bhrain:** ponder, enquestion, .brief catalog ([9a40747](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/9a407470437fd954dabdc121f21839f259b3cc6a))


### Bug Fixes

* **pkg:** make publishable again ([0c3cac3](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/0c3cac3f4e1d155abea1a42eea47020ee055e951))

## [1.1.0](https://github.com/ehmpathy/rhachet-roles-ehmpathy/compare/v1.0.0...v1.1.0) (2025-07-31)


### Features

* **bhrain:** &lt;cluster&gt; ([ffdbc62](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/ffdbc6221e4580c7e2fc2dbceb9999ac5702879f))
* **bhrain:** &lt;collect&gt; ideas generic skill; <enbranch> ideas generic skill ([a047df8](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/a047df8e0fa64cbb24252b5f6740d6dbbc212e0d))
* **bhrain:** &lt;envision&gt;[idea] with variable output structure ([bc3f3c8](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/bc3f3c856c9360e4215e853c99c420c8ffa261d2))
* **bhrain:** &lt;expand&gt; with swap artifacts ([a43e775](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/a43e775e85b8925f6bd5a09e1fb2f0521d5d2a42))
* **bhrain:** distill cognition briefs ([3a4b0b5](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/3a4b0b5e0abb90b640c326830aa3c189ff8b2cf7))
* **bhrain:** endialogue and summarize ([76805ea](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/76805ea4ebe4dcc98ab21feb6cde12dfbd68bb69))
* **bhrain:** interpret and diverge ([a3828ed](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/a3828ed9adb4697ec2175e311ae73d0e15a8e783))
* **brain:** halt on &lt;think&gt;, declare .route.chances ([cfa2758](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/cfa27586ef78f096d306d7d11555b81e8eb10a28))
* **ecologist:** distilisys briefs ++ ([dc1a207](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/dc1a2072c5295b8e0d29754d4a5ca0d3502aad9a))
* **ecologist:** study domain sketch and domain terms ([d7b6f03](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/d7b6f0349b45242317bec6411a748a732eb71976))
* **mechanic:** add skill mechanic.write; also genLoopFeedback ([8a2c46c](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/8a2c46c575c8b7ea016ea135e4cb162eec7f6300))


### Bug Fixes

* **pkg:** ensure rhachet dependency is provisioned ([b5521cd](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/b5521cdfae772c8d84a92a5d9711158fb9c1cda3))
* **pkg:** make package deployable and usable ([bde220f](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/bde220f6c912cc06df870fcc1483bcc11f587bb8))

## 1.0.0 (2025-07-14)


### Features

* **artifacts:** define genRouteStudyAsk with rhachet-artifact-git ([15d3ff1](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/15d3ff1d398e964ebdad929030d2df3376ed8c2a))
* **artifact:** withExpectOutput on get; also, artist responds to feedback ([0713445](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/071344527b83bd521335d00e38df924abd54f7cf))
* **breifs:** restructure under roles/mechanic; also, refs -&gt; breifs ([0d70dc3](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/0d70dc35202e1c9658dfb7d89c6ea8d417d0700c))
* **cli:** executable with config and instantiation ([d171854](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/d1718540408cae9cfb419e693687e78ba95e60a6))
* **cli:** invoke ask, list, and readme ([ab99c2a](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/ab99c2ae88cf39b6b625d5466d20f42e0878ed59))
* **critic:** breakout codestyle, behavior, architecture reviews separate ([56b6605](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/56b66054718621b994b6be8f51a8ef281548afaa))
* **designer:** outline distilisys loop ([9f65a78](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/9f65a78dce922d74cc730d9dc2cde0106cb0affe))
* **designer:** outline roadmap loop ([e25311c](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/e25311cf0711147ca5c525afed018b24ec159eab))
* **ecologist:** continue distillation of resources and mechanisms ([b325c58](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/b325c58dab1dcdf8a7d09a194132e58b434c7a36))
* **ecologist:** distill domain resources and mechanisms ([bbe4b69](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/bbe4b69c4e9db7125187499338afd0dcd488519b))
* **enroll:** support enroll thread to decrease verbosity ([6dac1d0](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/6dac1d0d6be145c0f2112e815a7a2ddf0b56a4c6))
* **feedback:** support editor open for feedback input ([90e910d](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/90e910d1a03b47d7b4ca602807ddd3a3f7d565d4))
* **feedback:** upgrade artist to take in critic.feedback; add judge ([4526248](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/45262485882dc8cc7e42ab7e5a7b9fb8319fd46b))
* **init:** initialize based on prior work ([78270e5](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/78270e58df5456532e13d7b425bfc868d3eba777))
* **mechanic:** add routeMechanicCodeIterate ([156e0e6](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/156e0e639ec4502bf15ce2a5e961dc5a3278935a))
* **mechanic:** cycled mechanic code propose flow ([6ec3292](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/6ec32926a93c96596334699eb990eeed827b0088))
* **mechanic:** reliably propose code via better context for critic and artist ([bbdfc53](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/bbdfc5355f15bd9322ace765f0668c563e3054e9))
* **registry:** establish the role registry and declare the mechanic role ([59aad4c](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/59aad4c4090e908e238d51a62e4664b3434b2b5d))
* **template:** get vars from thread utils ([e8e40ec](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/e8e40ec4f4bd2d10a6a1e43f79b4206a27c38121))
* **templates:** extend artifacts into templates; build imagine steps via templates ([584c012](https://github.com/ehmpathy/rhachet-roles-ehmpathy/commit/584c012ca94853ba53b77bd0dad533f2ee388685))
