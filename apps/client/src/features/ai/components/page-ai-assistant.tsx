import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { 
  Modal, 
  Stack, 
  Select, 
  Textarea, 
  Button, 
  Group, 
  Text,
  Box,
  ActionIcon,
  ScrollArea,
  Badge,
  Paper,
  Divider,
  Loader,
  ThemeIcon,
  UnstyledButton,
  Tooltip
} from "@mantine/core";
import { 
  IconRobot, 
  IconUser, 
  IconSend, 
  IconCheck, 
  IconCopy, 
  IconRefresh,
  IconSparkles,
  IconFileText,
  IconEdit
} from "@tabler/icons-react";
import { fetchModels, sendModelChat } from "@/features/ai/services/ai-service";
import { useAtomValue } from "jotai";
import { pageEditorAtom } from "@/features/editor/atoms/editor-atoms";
import { notifications } from "@mantine/notifications";
import { AIModel, ChatMessage } from "../types/ai.types";
import classes from "./page-ai-assistant.module.css";

interface AiAssistantProps {
  opened: boolean;
  onClose: () => void;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  id: string;
}

// Constants
const SCROLL_BEHAVIOR: ScrollBehavior = "smooth";
const MAX_RETRIES = 3;
const DEBOUNCE_DELAY = 300;

export default function PageAiAssistant({ opened, onClose }: AiAssistantProps) {
  const editor = useAtomValue(pageEditorAtom);
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageContent, setPageContent] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Memoized values
  const userMessages = useMemo(() => 
    messages.filter(m => m.role !== "system"), 
    [messages]
  );

  const isInputValid = useMemo(() => 
    selectedModel && input.trim().length > 0, 
    [selectedModel, input]
  );

  const modelOptions = useMemo(() => 
    models.map(m => ({ value: m.id, label: m.name })),
    [models]
  );

  // Callbacks
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: SCROLL_BEHAVIOR });
  }, []);

  const loadModels = useCallback(async () => {
    try {
      const data = await fetchModels();
      if (Array.isArray(data) && data.length > 0) {
        setModels(data);
        if (!selectedModel && data.length > 0) {
          setSelectedModel(data[0].id);
        }
      } else {
        setModels([]);
        notifications.show({
          title: "No AI Models",
          message: "No AI models are currently available. Please check your configuration.",
          color: "yellow"
        });
      }
    } catch (error: any) {
      console.error('Error fetching models:', error);
      setModels([]);
      notifications.show({
        title: "Connection Error",
        message: "Failed to load AI models. Please check your configuration.",
        color: "red"
      });
    }
  }, [selectedModel]);

  const generateMessageId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const handleSend = useCallback(async () => {
    if (!isInputValid) return;
    
    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
      id: generateMessageId()
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setRetryCount(0);
    
    try {
      const chatMessages = updatedMessages
        .filter(m => m.role !== "system")
        .map(m => ({ role: m.role, content: m.content }));
      
      if (pageContent) {
        chatMessages.unshift({
          role: "system",
          content: `You are an AI writing assistant. The user is working on a document with this content:\n\n${pageContent}\n\nHelp them improve, edit, or extend this content. Provide specific, actionable suggestions.`
        });
      }
      
      const res = await sendModelChat(selectedModel!, chatMessages);
      
      const assistantMessage: Message = {
        role: "assistant",
        content: res.message,
        timestamp: new Date(),
        id: generateMessageId()
      };
      
      setMessages([...updatedMessages, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        notifications.show({
          title: "Retrying...",
          message: `Attempt ${retryCount + 1}/${MAX_RETRIES}`,
          color: "yellow"
        });
        setTimeout(() => handleSend(), 1000 * Math.pow(2, retryCount));
      } else {
        notifications.show({
          title: "Error",
          message: error?.message || "Failed to get response from AI",
          color: "red",
          autoClose: 5000
        });
      }
    } finally {
      setLoading(false);
    }
  }, [isInputValid, input, messages, selectedModel, pageContent, retryCount, generateMessageId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleApplyToDocument = useCallback((content: string) => {
    if (editor) {
      editor.chain().focus().insertContent(content).run();
      notifications.show({
        title: "Applied to document",
        message: "Content has been added to your document",
        color: "green",
        icon: <IconCheck size={16} />
      });
    }
  }, [editor]);

  const handleCopyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      notifications.show({
        title: "Copied",
        message: "Message copied to clipboard",
        color: "blue",
        icon: <IconCopy size={16} />
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      notifications.show({
        title: "Copy Failed",
        message: "Unable to copy to clipboard",
        color: "red"
      });
    }
  }, []);

  const handleReplaceDocument = useCallback((content: string) => {
    if (editor) {
      editor.chain().focus().selectAll().insertContent(content).run();
      notifications.show({
        title: "Document replaced",
        message: "Document content has been replaced",
        color: "green",
        icon: <IconEdit size={16} />
      });
      onClose();
    }
  }, [editor, onClose]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setInput("");
    notifications.show({
      title: "Chat cleared",
      message: "Conversation has been cleared",
      color: "blue"
    });
  }, []);

  // Effects
  useEffect(() => {
    if (opened) {
      loadModels();
      inputRef.current?.focus();
    }
  }, [opened, loadModels]);

  useEffect(() => {
    if (opened && editor) {
      const text = editor.getText().trim();
      setPageContent(text);
      
      if (text) {
        const systemMessage: Message = {
          role: "system",
          content: `You are an AI writing assistant helping to edit a document. Here is the current content:\n\n${text}\n\nHelp the user improve, edit, or extend this content.`,
          timestamp: new Date(),
          id: generateMessageId()
        };
        setMessages([systemMessage]);
      } else {
        setMessages([]);
      }
    }
  }, [opened, editor, generateMessageId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setMessages([]);
      setInput("");
      setLoading(false);
    };
  }, []);

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      size="lg" 
      title={
        <Group>
          <ThemeIcon size="sm" color="blue" variant="light" aria-hidden>
            <IconSparkles size={16} />
          </ThemeIcon>
          <Text fw={600}>AI Writing Assistant</Text>
        </Group>
      }
      styles={{
        body: { padding: 0 },
        header: { padding: "16px 20px" }
      }}
      classNames={{
        header: classes.modalHeader
      }}
      aria-label="AI Writing Assistant"
      trapFocus
      closeOnEscape
    >
      <Stack gap={0} h={600} role="main" aria-label="AI chat interface">
        {/* Model Selection */}
        <Box p="md" className={classes.modelSection} role="region" aria-label="Model selection">
          <Group justify="space-between">
            <Select
              label="AI Model"
              placeholder="Select a model"
              data={modelOptions}
              value={selectedModel}
              onChange={setSelectedModel}
              leftSection={<IconRobot size={16} aria-hidden />}
              flex={1}
              size="sm"
              aria-describedby="model-help"
              required
            />
            <Text id="model-help" size="xs" c="dimmed" style={{ display: 'none' }}>
              Choose an AI model to chat with
            </Text>
            {userMessages.length > 0 && (
              <Tooltip label="Clear conversation">
                <ActionIcon 
                  variant="light" 
                  color="gray" 
                  onClick={clearChat}
                  mt="xl"
                  aria-label="Clear conversation history"
                >
                  <IconRefresh size={16} aria-hidden />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Box>

        {/* Messages Area */}
        <ScrollArea 
          flex={1} 
          p="md" 
          type="scroll"
          className={classes.scrollArea}
          role="log"
          aria-label="Chat messages"
          aria-live="polite"
        >
          {userMessages.length === 0 ? (
            <Stack align="center" justify="center" h={300} role="status">
              <ThemeIcon size={48} color="blue" variant="light" aria-hidden>
                <IconSparkles size={24} />
              </ThemeIcon>
              <Text c="dimmed" ta="center" size="sm" className={classes.emptyStateText}>
                Ask me anything about your document.<br />
                I can help you write, edit, improve, or extend your content.
              </Text>
              {pageContent && (
                <Badge 
                  variant="light" 
                  color="blue" 
                  leftSection={<IconFileText size={12} aria-hidden />}
                  aria-label={`Document loaded with ${pageContent.length} characters`}
                >
                  Document loaded ({pageContent.length} characters)
                </Badge>
              )}
            </Stack>
          ) : (
            <Stack gap="md">
              {userMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onApply={handleApplyToDocument}
                  onCopy={handleCopyMessage}
                  onReplace={handleReplaceDocument}
                  showActions={message.role === "assistant"}
                />
              ))}
              {loading && (
                <Paper 
                  p="md" 
                  radius="md" 
                  className={classes.loadingPaper}
                  role="status"
                  aria-label="AI is processing your message"
                >
                  <Group>
                    <ThemeIcon size="sm" color="blue" variant="light" aria-hidden>
                      <IconRobot size={14} />
                    </ThemeIcon>
                    <Loader size="xs" aria-hidden />
                    <Text size="sm" c="dimmed">AI is thinking...</Text>
                  </Group>
                </Paper>
              )}
              <div ref={messagesEndRef} aria-hidden />
            </Stack>
          )}
        </ScrollArea>

        {/* Input Area */}
        <Box p="md" className={classes.inputSection} role="region" aria-label="Message input">
          <Stack gap="xs">
            <Textarea
              ref={inputRef}
              placeholder="Ask me to help with your writing..."
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              minRows={2}
              maxRows={4}
              autosize
              disabled={!selectedModel}
              aria-label="Type your message to the AI assistant"
              aria-describedby="input-help"
            />
            <Text id="input-help" size="xs" c="dimmed" style={{ display: 'none' }}>
              Press Command+Enter to send your message
            </Text>
            <Group justify="space-between">
              <Text size="xs" c="dimmed" aria-label="Keyboard shortcut">
                Press ⌘+Enter to send
              </Text>
              <Button
                onClick={handleSend}
                disabled={!isInputValid || loading}
                leftSection={<IconSend size={16} aria-hidden />}
                size="sm"
                loading={loading}
                aria-label="Send message to AI assistant"
              >
                Send
              </Button>
            </Group>
          </Stack>
        </Box>
      </Stack>
    </Modal>
  );
}

interface MessageBubbleProps {
  message: Message;
  onApply: (content: string) => void;
  onCopy: (content: string) => void;
  onReplace: (content: string) => void;
  showActions: boolean;
}

function MessageBubble({ message, onApply, onCopy, onReplace, showActions }: MessageBubbleProps) {
  const isUser = message.role === "user";
  
  return (
    <Group align="flex-start" gap="sm">
      <ThemeIcon 
        size="sm" 
        color={isUser ? "gray" : "blue"} 
        variant="light"
        mt={4}
      >
        {isUser ? <IconUser size={14} /> : <IconRobot size={14} />}
      </ThemeIcon>
      
      <Stack gap="xs" flex={1}>
        <Paper
          p="md"
          radius="md"
          className={isUser ? classes.messageUserBubble : classes.messageAssistantBubble}
          style={{
            maxWidth: isUser ? "80%" : "100%",
            alignSelf: isUser ? "flex-end" : "flex-start"
          }}
        >
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }} className={classes.messageText}>
            {message.content}
          </Text>
        </Paper>
        
        {showActions && (
          <Group gap="xs">
            <UnstyledButton onClick={() => onCopy(message.content)}>
              <Group gap={4}>
                <IconCopy size={12} />
                <Text size="xs" className={classes.actionText}>Copy</Text>
              </Group>
            </UnstyledButton>
            
            <UnstyledButton onClick={() => onApply(message.content)}>
              <Group gap={4}>
                <IconCheck size={12} />
                <Text size="xs" className={classes.actionText}>Insert</Text>
              </Group>
            </UnstyledButton>
            
            <UnstyledButton onClick={() => onReplace(message.content)}>
              <Group gap={4}>
                <IconEdit size={12} />
                <Text size="xs" className={classes.actionText}>Replace document</Text>
              </Group>
            </UnstyledButton>
          </Group>
        )}
      </Stack>
    </Group>
  );
}
