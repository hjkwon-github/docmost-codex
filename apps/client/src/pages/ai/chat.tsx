import { useEffect, useState, useRef } from "react";
import { 
  Container, 
  Select, 
  Textarea, 
  Button, 
  Stack, 
  Text,
  Box,
  Group,
  Paper,
  Avatar,
  ActionIcon,
  ScrollArea,
  Divider,
  ThemeIcon,
  UnstyledButton,
  Loader,
  Alert,
  Badge,
  Tooltip
} from "@mantine/core";
import { 
  IconRobot, 
  IconUser, 
  IconSend, 
  IconCopy, 
  IconRefresh,
  IconSparkles,
  IconTrash,
  IconDownload,
  IconSettings
} from "@tabler/icons-react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { fetchModels, sendModelChat, AIModel } from "@/features/ai/services/ai-service";
import { notifications } from "@mantine/notifications";
import classes from "./chat.module.css";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AiChat() {
  const { t } = useTranslation();
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadModels = async () => {
    try {
      const data = await fetchModels();
      if (Array.isArray(data) && data.length > 0) {
        setModels(data);
        setSelectedModel(data[0].id);
        setIsConnected(true);
      } else {
        console.error('No models available');
        setModels([]);
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setModels([]);
      setIsConnected(false);
      notifications.show({
        title: "Connection Error",
        message: "Failed to connect to AI service. Please check your configuration.",
        color: "red"
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!selectedModel || !input.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date()
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    
    try {
      const chatMessages = updatedMessages.map(m => ({ 
        role: m.role, 
        content: m.content 
      }));
      
      const res = await sendModelChat(selectedModel, chatMessages);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res.message,
        timestamp: new Date()
      };
      
      setMessages([...updatedMessages, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      notifications.show({
        title: "Chat Error",
        message: "Failed to get response from AI. Please try again.",
        color: "red"
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    notifications.show({
      title: "Copied",
      message: "Message copied to clipboard",
      color: "blue"
    });
  };

  const clearChat = () => {
    setMessages([]);
    notifications.show({
      title: "Chat cleared",
      message: "Conversation history has been cleared",
      color: "blue"
    });
  };

  const exportChat = () => {
    const chatData = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const blob = new Blob([chatData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Container size="lg" h="100vh" p={0}>
      <Helmet>
        <title>{t("AI Chat")} | Docmost</title>
      </Helmet>
      
      <Stack h="100%" gap={0}>
        {/* Header */}
        <Paper p="md" shadow="xs" className={classes.header} style={{ borderRadius: 0 }}>
          <Group justify="space-between">
            <Group>
              <ThemeIcon size="lg" color="blue" variant="light">
                <IconSparkles size={20} />
              </ThemeIcon>
              <div>
                <Text fw={600} size="lg">AI Assistant</Text>
                <Text size="sm" c="dimmed">
                  {isConnected 
                    ? `Connected • ${models.length} model${models.length !== 1 ? 's' : ''} available`
                    : "Disconnected • Check configuration"
                  }
                </Text>
              </div>
            </Group>
            
            <Group>
              {messages.length > 0 && (
                <>
                  <Tooltip label="Export chat">
                    <ActionIcon variant="light" color="blue" onClick={exportChat}>
                      <IconDownload size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Clear chat">
                    <ActionIcon variant="light" color="red" onClick={clearChat}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Divider orientation="vertical" />
                </>
              )}
              
              <Select
                data={models.map(m => ({ 
                  value: m.id, 
                  label: `${m.name}${m.provider ? ` (${m.provider})` : ''}` 
                }))}
                value={selectedModel}
                onChange={setSelectedModel}
                placeholder="Select AI model"
                disabled={!isConnected}
                w={200}
                size="sm"
              />
              
              <Tooltip label="Refresh models">
                <ActionIcon variant="light" color="gray" onClick={loadModels}>
                  <IconRefresh size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </Paper>

        {/* Messages Area */}
        <Box flex={1} style={{ position: "relative" }}>
          {!isConnected && (
            <Alert 
              icon={<IconSettings size={16} />}
              title="AI Service Not Available" 
              color="yellow"
              m="md"
            >
              Please configure your AI settings in the environment variables or check if the AI service is running.
            </Alert>
          )}
          
          {messages.length === 0 && isConnected ? (
            <Stack align="center" justify="center" h="100%" gap="xl">
              <ThemeIcon size={80} color="blue" variant="light">
                <IconSparkles size={40} />
              </ThemeIcon>
              <div style={{ textAlign: "center" }}>
                <Text size="xl" fw={600} mb="xs">Start a conversation</Text>
                <Text c="dimmed" size="sm" mb="md" className={classes.emptyStateText}>
                  Ask me anything! I'm here to help you with information, creative tasks, and problem-solving.
                </Text>
                <Group justify="center" gap="xs">
                  <Badge variant="light" color="blue">Creative Writing</Badge>
                  <Badge variant="light" color="green">Code Help</Badge>
                  <Badge variant="light" color="purple">Analysis</Badge>
                  <Badge variant="light" color="orange">Research</Badge>
                </Group>
              </div>
            </Stack>
          ) : (
            <ScrollArea h="100%" type="scroll" p="md">
              <Stack gap="lg">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onCopy={copyMessage}
                  />
                ))}
                {loading && (
                  <Group>
                    <Avatar color="blue" radius="xl">
                      <IconRobot size={20} />
                    </Avatar>
                    <Paper p="md" radius="lg" className={classes.loadingBubble} flex={1}>
                      <Group gap="xs">
                        <Loader size="xs" />
                        <Text size="sm" c="dimmed">AI is thinking...</Text>
                      </Group>
                    </Paper>
                  </Group>
                )}
              </Stack>
              <div ref={messagesEndRef} />
            </ScrollArea>
          )}
        </Box>

        {/* Input Area */}
        <Paper p="md" shadow="xs" className={classes.inputArea}>
          <Stack gap="sm">
            <Group align="flex-end" gap="sm">
              <Textarea
                ref={inputRef}
                placeholder="Type your message here..."
                value={input}
                onChange={(e) => setInput(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                minRows={1}
                maxRows={4}
                autosize
                flex={1}
                disabled={!isConnected || !selectedModel}
                className={classes.textInput}
                styles={{
                  input: {
                    borderRadius: "12px"
                  }
                }}
              />
              <Button
                onClick={handleSend}
                disabled={loading || !selectedModel || !input.trim() || !isConnected}
                leftSection={<IconSend size={16} />}
                loading={loading}
                size="md"
                radius="lg"
              >
                Send
              </Button>
            </Group>
            
            <Group justify="space-between">
              <Text size="xs" className={classes.characterCountText}>
                Press ⌘+Enter to send • {input.length} characters
              </Text>
              {selectedModel && (
                <Group gap="xs">
                  <Text size="xs" c="dimmed">Using:</Text>
                  <Badge variant="light" size="xs">
                    {models.find(m => m.id === selectedModel)?.name || selectedModel}
                  </Badge>
                </Group>
              )}
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

interface MessageBubbleProps {
  message: Message;
  onCopy: (content: string) => void;
}

function MessageBubble({ message, onCopy }: MessageBubbleProps) {
  const isUser = message.role === "user";
  
  return (
    <Group align="flex-start" gap="sm">
      <Avatar 
        color={isUser ? "gray" : "blue"} 
        radius="xl"
        size="md"
      >
        {isUser ? <IconUser size={20} /> : <IconRobot size={20} />}
      </Avatar>
      
      <Box flex={1}>
        <Group justify="space-between" align="flex-start" mb="xs">
          <Text size="sm" fw={500} className={isUser ? classes.userName : classes.assistantName}>
            {isUser ? "You" : "AI Assistant"}
          </Text>
          <Group gap="xs">
            <Text size="xs" className={classes.timestampText}>
              {message.timestamp.toLocaleTimeString()}
            </Text>
            <UnstyledButton onClick={() => onCopy(message.content)}>
              <ActionIcon size="sm" variant="subtle" color="gray">
                <IconCopy size={14} />
              </ActionIcon>
            </UnstyledButton>
          </Group>
        </Group>
        
        <Paper
          p="md"
          radius="lg"
          className={isUser ? classes.messageUserBubble : classes.messageAssistantBubble}
          style={{
            maxWidth: "100%",
            wordBreak: "break-word"
          }}
        >
          <Text size="sm" className={classes.messageText} style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {message.content}
          </Text>
        </Paper>
      </Box>
    </Group>
  );
}
