import type {Metadata} from 'next';
import RainLab from './RainLab';
export const metadata:Metadata={title:'雨の判定ラボ | 開発者専用',robots:{index:false,follow:false}};
export default function RainLabPage(){return <RainLab/>;}
