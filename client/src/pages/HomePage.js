//
import {
  Box,
  Container,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Image
} from "@chakra-ui/react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Login from "../components/Authentication/Login";
import Signup from "../components/Authentication/Signup";

function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem("userInfo"));
    if (user) navigate("/chats");
  }, [navigate]);

  return (
    <Container maxW="xl" centerContent>
      <Box
        d="flex"
        justifyContent="center"
        flexDirection="column"
        alignItems="center"
        p={6}
        bg="rgba(255, 255, 255, 0.9)" // Glass effect
        backdropFilter="blur(10px)"
        w="100%"
        m="50px 0 15px 0"
        borderRadius="2xl"
        boxShadow="2xl"
      >
        <Text 
            fontSize="4xl" 
            fontFamily="Work sans" 
            fontWeight="bold" 
            bgGradient="linear(to-r, teal.500, blue.500)" 
            bgClip="text"
            mb={4}
        >
          Talk-A-Tive
        </Text>

        <Box w="100%">
            <Tabs isFitted variant="soft-rounded" colorScheme="teal">
            <TabList mb="1em">
                <Tab fontWeight="bold">Login</Tab>
                <Tab fontWeight="bold">Sign Up</Tab>
            </TabList>
            <TabPanels>
                <TabPanel>
                <Login />
                </TabPanel>
                <TabPanel>
                <Signup />
                </TabPanel>
            </TabPanels>
            </Tabs>
        </Box>
      </Box>
      
      <Text fontSize="xs" color="whiteAlpha.800" mt={5}>
          Secure • Fast • Real-time
      </Text>
    </Container>
  );
}

export default HomePage;