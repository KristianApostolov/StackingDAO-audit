export const rawBlockSQSEvent = {
  Records: [
    {
      messageId: "19dd0b57-b21e-4ac1-bd88-01bbb068cb78",
      receiptHandle: "MessageReceiptHandle",
      body: '{"canonical":true,"height":149167,"hash":"0x62eef6f4abe186251eea59930f6c715918fc38684e8240636e7c2891459cdb6f","block_time":1715099042,"block_time_iso":"2024-05-07T16:24:02.000Z","index_block_hash":"0x9f23aedf594de17f3b2f5ec6790ad301b05395c527e2e2a9b3a55f8301a8b3c5","parent_block_hash":"0xed71d4cedc4c748e50fb4ac6002f9e88dbcfebd02183a84f3f0f50dc7be00663","parent_index_block_hash":"0x488fe9bbad9142ed4faeef8766d89771510db623640ec500a66e10e3629db180","burn_block_time":1715099042,"burn_block_time_iso":"2024-05-07T16:24:02.000Z","burn_block_hash":"0x000000000000000000022be2223afcdef8a585e17c92de646f0a0aedc56b63a4","burn_block_height":842463,"miner_txid":"0x5b02a2782a1855f0d9d0acea97397165365feb349801b3ea89b2e15132a64e70","tx_count":83,"execution_cost_read_count":13510,"execution_cost_read_length":29075727,"execution_cost_runtime":220556494,"execution_cost_write_count":949,"execution_cost_write_length":70317}',
      attributes: {
        ApproximateReceiveCount: "1",
        SentTimestamp: "1523232000000",
        SenderId: "123456789012",
        ApproximateFirstReceiveTimestamp: "1523232000001",
      },
      messageAttributes: {},
      md5OfBody: "{{{md5_of_body}}}",
      eventSource: "aws:sqs",
      eventSourceARN: "arn:aws:sqs:us-east-1:123456789012:MyQueue",
      awsRegion: "us-east-1",
    },
  ],
};
