import React from 'react';
import { Composition } from 'remotion';
import { Timelapse } from './Timelapse';
import { makeTimeline } from '../timing.mjs';
import type { Props, TimelapseData } from './types';
import demo from '../demo.json';

const defaults: Props = { data: demo as TimelapseData, fps: 30, music: null, vertical: false };

export const Root: React.FC = () => (
  <Composition
    id="Timelapse"
    component={Timelapse}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={30 * 40}
    defaultProps={defaults}
    calculateMetadata={({ props }) => {
      const fps = props.fps ?? 30;
      const { total } = makeTimeline(props.data);
      return { fps, durationInFrames: Math.ceil(total * fps), width: props.vertical ? 1080 : 1920, height: props.vertical ? 1920 : 1080 };
    }}
  />
);
