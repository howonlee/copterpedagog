NodeCopter Pedagogy
===================

You take your nodecopter, you teach it things by moving it, and it should learn.

Currently, the moving it part doesn't work because there needs to be some decent probabilistic filters on this business. Large parts aren't finished yet.

Instructions
------------

### Recording

Turn your AR drone on. Then, connect to your AR drone. Go to ./src/ and then run

    node record.js

Usually, you will want to `b`egin your recording, then `s`ave it. (Saving will make your drone land) Then, connect back onto the Internet, and then sync it to a remote database with `w`.

Note that a weirdness indicates that you should press the sync button (w) *after* reconnecting to the internet, not before.

### Replaying

Turn your AR drone on. Then, connect to your AR drone. Go to ./src/ and then run

    node replay.js

It will ask you if you want to replay from a local file or from a remote db. If you want to replay from a remote db, you should also enter the name of the recording. Then, it will replay the recording.
