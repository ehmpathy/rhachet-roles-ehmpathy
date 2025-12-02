else is a code REAK

its not even a smell

its such a bad smell that it reaks

---

else's can _always_ be better rewriten as an IFFE+EarlyReturn

---

see the narrative flow breifs for more context on the desired goal


-------

e.g.,

> no if else; only early returns; else is a code REAK

● You're right - the if/else violates the flow:narrative tactic. Let me
  refactor to use early returns only:

● Update(src/domain.operations/vpcTunnel/setVpcTunnel.ts)
  ⎿  Updated src/domain.operations/vpcTunnel/setVpcTunnel.ts with 5
     additions and 3 removals
       81      if (portInUse) {
       82        const cacheFilePresent = await isFilePresent({ path:
            cachePath });
       83
       84 +      // port used by unknown process; kill it to reclaim
       85 +      if (!cacheFilePresent) {
       86 +        killProcessOnPort({ port: input.from.port });
       87 +      }
       88 +
       89        // check if existing tunnel is ours and healthy
       90        if (cacheFilePresent) {
       91          const cacheContent = await fs.readFile(cachePath,
            'utf-8');
     ...
       100          // cleanup stale tunnel
       101          if (isProcessAlive({ pid: cache.pid }))
             process.kill(cache.pid, 'SIGTERM');
       102          await fs.rm(cachePath, { force: true });
       103 -      } else {
       104 -        // port used by another process; kill it to reclaim
       105 -        killProcessOnPort({ port: input.from.port });
       103        }
       104      }
       105

● Removed the else block - now both conditions are independent if statements
   with no branching maze.
