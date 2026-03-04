import re

with open('main.py', 'r') as f:
    content = f.read()

# Replace get_program_accounts call
old_code = """            all_accounts = await self.client.get_program_accounts(
                METEORA_DLMM_PROGRAM_ID,
                TokenAccountOpts(encoding="base64", data_slice=None, commitment="confirmed")
            )

            # Filter and decode 'Position' accounts
            for account_info in all_accounts.value:
                try:
                    # Attempt to decode as a Position account
                    decoded_account = await self.meteora_dlmm_program.account["Position"].fetch(account_info.pubkey)
                    if decoded_account.owner == owner_pubkey:"""

new_code = """            # Use memcmp to filter 'Position' accounts by owner directly on the RPC node
            # The 'owner' field is the first field in the 'Position' struct, after the 8-byte discriminator.
            # So the offset is 8.
            memcmp_opts = [MemcmpOpts(offset=8, bytes=str(owner_pubkey))]
            
            all_accounts = await self.client.get_program_accounts(
                METEORA_DLMM_PROGRAM_ID,
                encoding="base64",
                commitment="confirmed",
                filters=memcmp_opts
            )

            for account_info in all_accounts.value:
                try:
                    # Attempt to decode as a Position account
                    decoded_account = await self.meteora_dlmm_program.account["Position"].fetch(account_info.pubkey)
                    if True: # The filter already ensures it belongs to owner_pubkey"""

content = content.replace(old_code, new_code)

with open('main.py', 'w') as f:
    f.write(content)
