import { useEffect, useState } from "react";
import { Container, Select, Textarea, Button, Stack } from "@mantine/core";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { fetchModels, sendChat } from "@/features/ai/services/ai-service";

interface Message {
  role: string;
  content: string;
}

export default function AiChat() {
  const { t } = useTranslation();
  const [models, setModels] = useState<string[]>([]);
  const [provider, setProvider] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchModels().then(setModels).catch(() => setModels([]));
  }, []);

  const handleSend = async () => {
    if (!provider || !input) return;
    const next = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await sendChat({ provider, messages: next });
      setMessages([...next, { role: "assistant", content: res.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={600} pt="md">
      <Helmet>
        <title>{t("AI Chat")}</title>
      </Helmet>
      <Stack>
        <Select
          label={t("Model")}
          data={models}
          value={provider}
          onChange={setProvider}
          allowDeselect={false}
        />
        <Textarea
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          minRows={3}
        />
        <Button onClick={handleSend} disabled={loading || !provider || !input}>
          {t("Send")}
        </Button>
        {messages.map((m, i) => (
          <div key={i}>
            <b>{m.role}:</b> {m.content}
          </div>
        ))}
      </Stack>
    </Container>
  );
}
