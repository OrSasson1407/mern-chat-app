import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Box } from "@chakra-ui/react";
import { useEffect, useRef } from "react";

const CallModal = ({ isOpen, onClose, localStream, remoteStream, answerCall, isReceivingCall, callerName }) => {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
      <ModalOverlay />
      <ModalContent bg="gray.800" color="white">
        <ModalHeader>{isReceivingCall ? `Incoming Call from ${callerName}` : "Video Call"}</ModalHeader>
        <ModalBody>
          <Box display="flex" gap={4} flexDirection={{ base: "column", md: "row" }}>
            {/* My Video */}
            <Box flex={1} position="relative">
              <video ref={localVideoRef} autoPlay muted playsInline style={{ borderRadius: "10px", width: "100%" }} />
              <Box position="absolute" bottom={2} left={2} bg="blackAlpha.600" px={2} borderRadius="md">You</Box>
            </Box>
            {/* Their Video */}
            <Box flex={1} position="relative" bg="black" borderRadius="10px" display="flex" alignItems="center" justifyContent="center">
              {remoteStream ? (
                <video ref={remoteVideoRef} autoPlay playsInline style={{ borderRadius: "10px", width: "100%" }} />
              ) : (
                <Box>Waiting for connection...</Box>
              )}
            </Box>
          </Box>
        </ModalBody>
        <ModalFooter justifyContent="center" gap={4}>
          {isReceivingCall && !remoteStream ? (
            <Button colorScheme="green" onClick={answerCall}>Answer</Button>
          ) : null}
          <Button colorScheme="red" onClick={onClose}>End Call</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CallModal;