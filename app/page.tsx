"use client";

import { CloseIcon } from "@/components/CloseIcon";
import { NoAgentNotification } from "@/components/NoAgentNotification";
import TranscriptionView from "@/components/TranscriptionView";
import {
  BarVisualizer,
  DisconnectButton,
  RoomAudioRenderer,
  RoomContext,
  VoiceAssistantControlBar,
  useVoiceAssistant,
} from "@livekit/components-react";
import { useKrispNoiseFilter } from "@livekit/components-react/krisp";
import { AnimatePresence, motion } from "framer-motion";
import { Room, RoomEvent } from "livekit-client";
import { useCallback, useEffect, useState } from "react";
import type { ConnectionDetails } from "./api/connection-details/route";

export default function Page() {
  const [room] = useState(new Room());

  const onConnectButtonClicked = useCallback(async () => {
    // Generate room connection details, including:
    //   - A random Room name
    //   - A random Participant name
    //   - An Access Token to permit the participant to join the room
    //   - The URL of the LiveKit server to connect to
    //
    // In real-world application, you would likely allow the user to specify their
    // own participant name, and possibly to choose from existing rooms to join.

    const url = new URL(
      process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? "/api/connection-details",
      window.location.origin
    );
    const response = await fetch(url.toString());
    const connectionDetailsData: ConnectionDetails = await response.json();

    await room.connect(connectionDetailsData.serverUrl, connectionDetailsData.participantToken);
    await room.localParticipant.setMicrophoneEnabled(true);
  }, [room]);

  useEffect(() => {
    room.on(RoomEvent.MediaDevicesError, onDeviceFailure);

    return () => {
      room.off(RoomEvent.MediaDevicesError, onDeviceFailure);
    };
  }, [room]);

  return (
    <main data-lk-theme="default" className="h-full grid content-center bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white min-h-screen">
      <RoomContext.Provider value={room}>
        <div className="lk-room-container max-h-[90vh] relative">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-500 to-blue-400 bg-[length:200%_auto] animate-gradient text-transparent bg-clip-text"
            >
              Professor AGI
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-sm text-gray-400 max-w-md mx-auto"
            >
              An experimental AI voice assistant. This is a beta version - please be patient as we refine the experience.
            </motion.p>
          </div>
          <SimpleVoiceAssistant onConnectButtonClicked={onConnectButtonClicked} />
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-xs text-gray-500"
          >
            <p>By using this service, you acknowledge this is an experimental AI system.</p>
            <p>Your interactions help improve the technology.</p>
          </motion.div>
        </div>
      </RoomContext.Provider>
    </main>
  );
}

function SimpleVoiceAssistant(props: { onConnectButtonClicked: () => void }) {
  const { state: agentState } = useVoiceAssistant();
  return (
    <>
      <AnimatePresence>
        {agentState === "disconnected" && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 0 20px rgba(99, 102, 241, 0.5)"
            }}
            whileTap={{ 
              scale: 0.95,
              boxShadow: "0 0 0 rgba(0,0,0,0.2)"
            }}
            transition={{ 
              duration: 0.5,
              ease: [0.09, 1.04, 0.245, 1.055],
              scale: { duration: 0.1 }
            }}
            className="group overflow-hidden uppercase absolute left-1/2 -translate-x-1/2 px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_100%] hover:bg-[position:100%_0] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-500 font-bold tracking-wider text-xl backdrop-blur-sm"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              const button = e.currentTarget;
              const ripple = document.createElement('span');
              ripple.className = 'absolute inset-0 bg-white/20 rounded-xl animate-ripple';
              button.appendChild(ripple);
              
              setTimeout(() => {
                ripple.remove();
              }, 600);
              
              props.onConnectButtonClicked();
            }}
          >
            <span className="relative z-10 flex items-center gap-3">
              <motion.span 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                className="w-2 h-2 bg-white rounded-full"
              />
              Talk To Professor AGI
              <motion.span 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.5 }}
                className="w-2 h-2 bg-white rounded-full"
              />
            </span>
          </motion.button>
        )}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-3/4 lg:w-1/2 mx-auto h-full backdrop-blur-sm bg-white/10 rounded-lg p-4 shadow-lg"
        >
          <TranscriptionView />
        </motion.div>
      </AnimatePresence>

      <RoomAudioRenderer />
      <NoAgentNotification state={agentState} />
      <div className="fixed bottom-0 w-full px-4 py-2">
        <ControlBar />
      </div>
    </>
  );
}

function ControlBar() {
  /**
   * Use Krisp background noise reduction when available.
   * Note: This is only available on Scale plan, see {@link https://livekit.io/pricing | LiveKit Pricing} for more details.
   */
  const krisp = useKrispNoiseFilter();
  useEffect(() => {
    krisp.setNoiseFilterEnabled(true);
  }, [krisp.setNoiseFilterEnabled]);

  const { state: agentState, audioTrack } = useVoiceAssistant();

  return (
    <div className="relative h-[100px]">
      <AnimatePresence>
        {agentState !== "disconnected" && agentState !== "connecting" && (
          <motion.div
            initial={{ opacity: 0, top: "10px" }}
            animate={{ opacity: 1, top: 0 }}
            exit={{ opacity: 0, top: "-10px" }}
            transition={{ duration: 0.4, ease: [0.09, 1.04, 0.245, 1.055] }}
            className="flex absolute w-full h-full justify-between px-8 sm:px-4"
          >
            <BarVisualizer
              state={agentState}
              barCount={5}
              trackRef={audioTrack}
              className="agent-visualizer w-24 gap-2"
              options={{ minHeight: 12 }}
            />
            <div className="flex items-center">
              <VoiceAssistantControlBar controls={{ leave: false }} />
              <DisconnectButton>
                <CloseIcon />
              </DisconnectButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function onDeviceFailure(error: Error) {
  console.error(error);
  alert(
    "Error acquiring camera or microphone permissions. Please make sure you grant the necessary permissions in your browser and reload the tab"
  );
}
