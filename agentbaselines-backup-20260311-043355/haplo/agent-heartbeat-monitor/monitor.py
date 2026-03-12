
import os
import time
from datetime import datetime, timedelta
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Channel to notify (replace with actual channel ID if needed)
# For now, we'll just log the notification details
# If a message tool is available and configured for #jarvis, we can use it.
JARVIS_CHANNEL_ID = "#jarvis" 
INACTIVITY_THRESHOLD_MINUTES = 60

def get_active_sessions():
    """
    Fetches active sessions using the sessions_list tool.
    Returns a list of session dictionaries or an empty list if an error occurs.
    """
    try:
        # In a real agent environment, this would call the tool:
        # sessions = default_api.sessions_list(activeMinutes=1) 
        # For now, simulating data
        sessions = [
            {"sessionKey": "session1", "label": "main-session", "lastMessage": {"timestamp": time.time() - 30*60}}, # Active, < 60 min ago
            {"sessionKey": "session2", "label": "cron-job-A", "lastMessage": {"timestamp": time.time() - 70*60}}, # Inactive, > 60 min ago
            {"sessionKey": "session3", "label": "cron-job-B", "lastMessage": {"timestamp": time.time() - 10*60}}, # Active, < 60 min ago
            {"sessionKey": "session4", "label": "developer-session", "lastMessage": {"timestamp": time.time() - 120*60}}, # Inactive, > 60 min ago
        ]
        logging.info(f"Found {len(sessions)} active sessions.")
        return sessions
    except Exception as e:
        logging.error(f"Error fetching active sessions: {e}")
        return []

def check_session_heartbeats():
    """
    Checks heartbeats of active sessions and logs warnings for inactive ones.
    """
    sessions = get_active_sessions()
    now = time.time()
    
    for session in sessions:
        session_key = session.get("sessionKey", "unknown")
        session_label = session.get("label", "N/A")
        last_message_data = session.get("lastMessage", {})
        last_message_timestamp = last_message_data.get("timestamp")

        if last_message_timestamp:
            last_activity_time = datetime.fromtimestamp(last_message_timestamp)
            inactivity_duration = now - last_message_timestamp
            
            if inactivity_duration > INACTIVITY_THRESHOLD_MINUTES * 60:
                logging.warning(
                    f"Session '{session_label}' ({session_key}) inactive for "
                    f"{timedelta(seconds=inactivity_duration)} (Threshold: {INACTIVITY_THRESHOLD_MINUTES} mins). "
                    f"Last activity: {last_activity_time}"
                )
                # In a real scenario, this would trigger a notification to #jarvis
                # Example: message_tool.send(channel=JARVIS_CHANNEL_ID, message=f"ALERT: Session '{session_label}' ({session_key}) is inactive for {timedelta(seconds=inactivity_duration)}.")
                log_notification_for_jarvis(session_label, session_key, inactivity_duration)
            else:
                logging.info(
                    f"Session '{session_label}' ({session_key}) is active. "
                    f"Last activity: {last_activity_time}"
                )
        else:
            logging.warning(f"Session '{session_label}' ({session_key}) has no last message timestamp. Assuming inactive.")
            # Handle sessions with no timestamp, potentially marking them as inactive immediately
            # This depends on how sessions_list reports sessions with no recent messages.
            # For now, logging a warning.
            log_notification_for_jarvis(session_label, session_key, "unknown duration (no timestamp)")


def log_notification_for_jarvis(session_label, session_key, duration):
    """
    Simulates logging a notification that would be sent to #jarvis.
    """
    notification_message = (
        f"ALERT: Session '{session_label}' ({session_key}) is inactive. "
        f"Duration: {duration}. Threshold: {INACTIVITY_THRESHOLD_MINUTES} mins. "
        f"Consider investigating session status."
    )
    logging.info(f"Notification for #jarvis: {notification_message}")

if __name__ == "__main__":
    logging.info("Starting agent heartbeat monitor...")
    # In a real cron job scenario, this might run periodically.
    # For this script, we'll run the check once.
    check_session_heartbeats()
    logging.info("Agent heartbeat monitor finished.")
