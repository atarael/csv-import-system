import { broadcast } from './wsServer';
export const publishJobEvent = (event: {
  type: string;
  payload: any;
}) => {
  broadcast(event);
};
