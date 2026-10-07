type Props = {
  isRecording: boolean
  isProcessing: boolean
}

/** Big glossy push-to-talk pill. Display only: the Space key drives it. */
export default function TalkButton({ isRecording, isProcessing }: Props) {
  const tone = isRecording ? 'terracotta' : isProcessing ? 'marble' : 'blue'
  return (
    <div
      className="glossy flex h-[78px] min-w-[380px] select-none items-center justify-center px-10"
      data-tone={tone}
      data-pressed={isRecording}
      role="status"
    >
      {isRecording ? (
        <span className="chunky-sm relative text-[30px] text-white">Listening… let go to send</span>
      ) : isProcessing ? (
        <span className="chunky-sm relative text-[30px] text-white">
          Thinking
          <span className="think-dot" style={{ animationDelay: '0s' }}>.</span>
          <span className="think-dot" style={{ animationDelay: '0.15s' }}>.</span>
          <span className="think-dot" style={{ animationDelay: '0.3s' }}>.</span>
        </span>
      ) : (
        <span className="chunky-sm relative text-[30px] text-white">Hold SPACE to talk</span>
      )}
    </div>
  )
}
