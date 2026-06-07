from flask import Flask, render_template, request, redirect, url_for, flash
import mysql.connector
from mysql.connector import Error
import datetime

app = Flask(__name__)
app.secret_key = 'jbnu_secret_factory_key' # Required for form submission flashing feedback messages

# 1. ENCAPSULATED RELATIONAL CONNECTOR ENGINE
def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host='210.117.165.104',
            port=3306,
            user='dbuser09',          # Matches your active school user target
            password='dbuser2026',
            database='dbuser09_schema' # Matches your active schema destination log
        )
        return connection
    except Error as e:
        print(f"Error connecting to JBNU Server: {e}")
        return None

# 2. ROUTE: THE CENTRAL FACTORY MONITORING COCKPIT (DASHBOARD)
@app.route('/')
def dashboard():
    # Capture the user selection dropdown filter context; defaults to Experiment/Run 1
    equipment_id = request.args.get('equipment_id', 1, type=int)
    
    conn = get_db_connection()
    if not conn:
        return "Database Connection Failed. Verify target configuration metrics.", 500
    
    cursor = conn.cursor(dictionary=True)
    
    # Query A: Fetch metadata overview about all available machinery to build the filter selectors
    cursor.execute("SELECT equipment_id, name, status FROM equipment ORDER BY equipment_id;")
    machinery_list = cursor.fetchall()
    
    # Query B: Contextually inspect current profile metrics for the isolated active equipment focus
    cursor.execute("SELECT * FROM equipment WHERE equipment_id = %s;", (equipment_id,))
    active_machine = cursor.fetchall()[0]
    
    # Query C: Aggregate metrics showing total open unresolved incidents left on this machine run
    cursor.execute("""
        SELECT COUNT(*) as open_alerts FROM alert 
        WHERE equipment_id = %s AND resolved = 0;
    """, (equipment_id,))
    alert_metrics = cursor.fetchall()[0]
    
    # Query D: Grab chronological sliding time frame window datasets (100 ticks) to render dynamic Chart.js lines
    cursor.execute("""
        SELECT recorded_at, vibration, temperature, spindle_speed, anomaly_score 
        FROM sensor_reading 
        WHERE equipment_id = %s 
        ORDER BY recorded_at ASC 
        LIMIT 100;
    """, (equipment_id,))
    timeline_records = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    # Format dates into clean string arrays to safely feed charting endpoints
    chart_timestamps = [row['recorded_at'].strftime('%H:%M:%S.%f')[:-5] for row in timeline_records]
    chart_scores = [float(row['anomaly_score']) for row in timeline_records]
    chart_vibration = [float(row['vibration']) for row in timeline_records]
    
    return render_template(
        'dashboard.html',
        machinery_list=machinery_list,
        active_machine=active_machine,
        open_alerts=alert_metrics['open_alerts'],
        chart_timestamps=chart_timestamps,
        chart_scores=chart_scores,
        chart_vibration=chart_vibration,
        current_id=equipment_id
    )

# 3. ROUTE: THE INTERACTIVE INCIDENT RESOLUTION CENTER (ALERTS LOG)
@app.route('/alerts')
def alerts_center():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Relational Join to bring descriptive machine context labels alongside raw incident records
    cursor.execute("""
        SELECT a.alert_id, a.equipment_id, e.name as machine_name, a.triggered_at, a.severity, a.message, a.resolved 
        FROM alert a
        JOIN equipment e ON a.equipment_id = e.equipment_id
        ORDER BY a.resolved ASC, a.triggered_at DESC;
    """)
    all_alerts = cursor.fetchall()
    
    cursor.close()
    conn.close()
    return render_template('alerts.html', all_alerts=all_alerts)

# 4. ROUTE: EXECUTING DATABASE WRITE-BACK FORM PROCESSES (3NF DATA INTEGRITY CLOSING)
@app.route('/resolve-alert', methods=['POST'])
def resolve_alert_form():
    alert_id = request.form.get('alert_id')
    equipment_id = request.form.get('equipment_id')
    technician = request.form.get('technician')
    action_taken = request.form.get('action_taken')
    
    if not technician or not action_taken:
        return redirect(url_for('alerts_center'))
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Action 1: Mutate target incident entry state mapping flags from Unresolved (0) to Resolved (1)
        cursor.execute("UPDATE alert SET resolved = 1 WHERE alert_id = %s;", (alert_id,))
        
        # Action 2: Structurally insert audit entry logs into our maintenance history table ledger tracking human input
        cursor.execute("""
            INSERT INTO maintenance_log (equipment_id, alert_id, action_taken, technician)
            VALUES (%s, %s, %s, %s);
        """, (equipment_id, alert_id, action_taken, technician))
        
        conn.commit()
    except Error as e:
        print(f"Transaction roll back executed: {e}")
        conn.rollback()
        
    cursor.close()
    conn.close()
    return redirect(url_for('alerts_center'))

if __name__ == '__main__':
    # Starts standard development deployment hosting matrix engines locally
    app.run(debug=True, port=5000)