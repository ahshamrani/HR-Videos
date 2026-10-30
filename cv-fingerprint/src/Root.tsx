import {Composition} from 'remotion';
import {Demo, DEMO_TOTAL} from './Demo';
import {TOTAL, Video} from './Video';
import {FPS} from './kit/theme';

export const RemotionRoot: React.FC = () => (
	<>
		<Composition id="CvFingerprint" component={Video} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
		<Composition id="Demo" component={Demo} durationInFrames={DEMO_TOTAL} fps={FPS} width={1080} height={1920} />
	</>
);
