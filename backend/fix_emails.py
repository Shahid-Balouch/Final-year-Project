import sqlite3
import os

# Database file path
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "AI Surviallance.db")

print(f"Connecting to database: {db_path}")

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Show current state before update
print("\nBefore update:")
cur.execute("SELECT id, username, email, role FROM users ORDER BY id")
for r in cur.fetchall():
    print(f"  {r}")

# Count rows with @smartsurv.local before update
cur.execute("SELECT COUNT(*) FROM users WHERE email LIKE '%smartsurv.local%'")
count_before = cur.fetchone()[0]
print(f"\nRows with @smartsurv.local before update: {count_before}")

# Run the REPLACE update
cur.execute("UPDATE users SET email = REPLACE(email, '@smartsurv.local', '@aisurve.local')")
updated_rows = cur.rowcount
conn.commit()

# Show current state after update
print("\nAfter update:")
cur.execute("SELECT id, username, email, role FROM users ORDER BY id")
for r in cur.fetchall():
    print(f"  {r}")

# Count rows with @smartsurv.local after update
cur.execute("SELECT COUNT(*) FROM users WHERE email LIKE '%smartsurv.local%'")
count_after = cur.fetchone()[0]
print(f"\nRows with @smartsurv.local after update: {count_after}")

print(f"\nTotal rows updated by REPLACE: {updated_rows}")

conn.close()
print("\nDone! Database email domain replacement complete.")
