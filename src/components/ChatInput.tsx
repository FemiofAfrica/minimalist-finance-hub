import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Supabase client instance

const ChatInput = () => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any>([]);

  const sendMessage = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{ content: message, user_id: (await supabase.auth.getUser()).data?.user?.id }]);

      if (error) {
        console.error('Error sending message:', error);
      } else {
        setMessage(''); // Clear the input
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message here..."
      />
      <button onClick={sendMessage} disabled={loading}>
        {loading ? 'Sending...' : 'Send'}
      </button>
      <ul>
        {messages.map((msg, index) => (
          <li key={index}>{msg.content}</li>
        ))}
      </ul>
    </div>
  );
};

export default ChatInput;
