import "./QueueNotice.css";

const LOCAL_DATABASE_URL = "https://github.com/yaooo919/CasVarDB.git";

function QueueNotice() {
  return (
    <div className="queue-notice" role="status" aria-live="polite">
      Your request has been put on the queue. Please wait on this page without refreshing. Alternatively, you can{" "}
      <a href={LOCAL_DATABASE_URL} target="_blank" rel="noreferrer">
        install the database locally
      </a>.
    </div>
  );
}

export default QueueNotice;
