import { useEffect, useState } from "react";
import { Modal, Stack, Select, Textarea, Button, Group } from "@mantine/core";
import { fetchModels, sendChat } from "@/features/ai/services/ai-service";
import { useAtomValue } from "jotai";
import { pageEditorAtom } from "@/features/editor/atoms/editor-atoms";

interface AiAssistantProps {
  opened: boolean;
  onClose: () => void;
}

interface Message {
  role: string;
  content: string;
}

export default function PageAiAssistant({ opened, onClose }: AiAssistantProps) {
  const editor = useAtomValue(pageEditorAtom);
  const [models, setModels] = useState<string[]>([]);
  const [provider, setProvider] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("\");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchModels().then(setModels).catch(() => setModels([]));
  }, []);

  useEffect(() => {
    if (opened && editor) {
      const text = editor.getText();
      setMessages([{ role: "system", content: `Current page content:\n${text}` }]);
    }
  }, [opened, editor]);

  const handleSend = async () => {
    if (!provider || !input) return;
    const next = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("\");
    setLoading(true);
    try {
      const res = await sendChat({ provider, messages: next });
      setMessages([...next, { role: "assistant", content: res.message }]);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && editor) {
      editor.chain().focus().insertContent(last.content).run();
    }
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} size={600} title="AI Assistant">
      <Stack>
        <Select
          label="Model"
          data={models}
          value={provider}
          onChange={setProvider}
          allowDeselect={false}
        />
        <div style={{ maxHeight: 200, overflowY: "auto" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <b>{m.role}:</b> {m.content}
            </div>
          ))}
        </div>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          minRows={3}
        />
        <Group justify="flex-end">
          <Button onClick={handleSend} disabled={loading || !provider || !input}>
            Send
          </Button>
          <Button onClick={handleApply} disabled={!messages.find((m) => m.role === "assistant")}>Apply</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
