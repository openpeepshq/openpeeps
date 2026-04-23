import {AudioSession} from '@livekit/react-native';
import React, {useEffect, useState} from 'react';
import {Button} from '../../../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../ui/dropdown-menu';
import {ThemedText} from '../../../ui/themed-text';
import {Volume2Icon} from '../../../icons';

export const AudioOutputList = () => {
  const [audioOutputs, setAudioOutputs] = useState<string[]>([]);

  useEffect(() => {
    const loadAudioOutputs = async () => {
      const outputs = await AudioSession.getAudioOutputs();
      setAudioOutputs(outputs);
    };

    loadAudioOutputs();
  }, []);

  const selectOutput = async (deviceId: string) => {
    await AudioSession.selectAudioOutput(deviceId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Volume2Icon size={24} className="text-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          {audioOutputs.map(output => (
            <DropdownMenuItem onPress={() => selectOutput(output)} key={output}>
              <ThemedText>{output}</ThemedText>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
