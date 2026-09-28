//! Integration tests against the compiled program in LiteSVM.

use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{clock::Clock, instruction::Instruction, system_program},
        AccountDeserialize, InstructionData, ToAccountMetas,
    },
    litesvm::{types::FailedTransactionMetadata, LiteSVM},
    litesvm_token::{
        get_spl_account, spl_token::state::Account as SplAccount, Approve,
        CreateAssociatedTokenAccount, CreateMint, MintTo, Transfer as TokenTransfer, TOKEN_ID,
    },
    monthly::{constants::*, error::MonthlyError, state::*},
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

const USDC: u64 = 1_000_000; // 6 decimals
const PLAN_AMOUNT: u64 = 20 * USDC;
const INTERVAL: i64 = 30 * 24 * 60 * 60;
const PLAN_ID: u64 = 1;

struct World {
    svm: LiteSVM,
    program_id: Pubkey,
    merchant: Keypair,
    subscriber: Keypair,
    anyone: Keypair,
    mint: Pubkey,
    merchant_ata: Pubkey,
    subscriber_ata: Pubkey,
    authority: Pubkey,
    plan: Pubkey,
    subscription: Pubkey,
}

impl World {
    fn new() -> Self {
        let program_id = monthly::id();
        let mut svm = LiteSVM::new();
        let bytes = include_bytes!(concat!(env!("CARGO_TARGET_TMPDIR"), "/../deploy/monthly.so"));
        svm.add_program(program_id, bytes).unwrap();

        let merchant = Keypair::new();
        let subscriber = Keypair::new();
        let anyone = Keypair::new();
        for k in [&merchant, &subscriber, &anyone] {
            svm.airdrop(&k.pubkey(), 10_000_000_000).unwrap();
        }

        let mint = CreateMint::new(&mut svm, &merchant).decimals(6).send().unwrap();
        let merchant_ata = CreateAssociatedTokenAccount::new(&mut svm, &merchant, &mint)
            .send()
            .unwrap();
        let subscriber_ata = CreateAssociatedTokenAccount::new(&mut svm, &subscriber, &mint)
            .send()
            .unwrap();
        MintTo::new(&mut svm, &merchant, &mint, &subscriber_ata, 1_000 * USDC)
            .send()
            .unwrap();

        let authority = Pubkey::find_program_address(&[AUTHORITY_SEED], &program_id).0;
        let plan = Pubkey::find_program_address(
            &[PLAN_SEED, merchant.pubkey().as_ref(), &PLAN_ID.to_le_bytes()],
            &program_id,
        )
        .0;
        let subscription = Pubkey::find_program_address(
            &[SUBSCRIPTION_SEED, plan.as_ref(), subscriber.pubkey().as_ref()],
            &program_id,
        )
        .0;

        World {
            svm,
            program_id,
            merchant,
            subscriber,
            anyone,
            mint,
            merchant_ata,
            subscriber_ata,
            authority,
            plan,
            subscription,
        }
    }

    fn send(
        &mut self,
        ix: Instruction,
        signer: &Keypair,
    ) -> Result<(), FailedTransactionMetadata> {
        self.svm.expire_blockhash();
        let blockhash = self.svm.latest_blockhash();
        let msg = Message::new_with_blockhash(&[ix], Some(&signer.pubkey()), &blockhash);
        let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[signer]).unwrap();
        self.svm.send_transaction(tx).map(|_| ())
    }

    fn now(&self) -> i64 {
        self.svm.get_sysvar::<Clock>().unix_timestamp
    }

    fn warp(&mut self, seconds: i64) {
        let mut clock = self.svm.get_sysvar::<Clock>();
        clock.unix_timestamp += seconds;
        self.svm.set_sysvar::<Clock>(&clock);
    }

    fn balance(&self, ata: &Pubkey) -> u64 {
        get_spl_account::<SplAccount>(&self.svm, ata).unwrap().amount
    }

    fn approve(&mut self, amount: u64) {
        let (delegate, source) = (self.authority, self.subscriber_ata);
        Approve::new(&mut self.svm, &self.subscriber, &delegate, &source, amount)
            .send()
            .unwrap();
    }

    fn plan_state(&self) -> Plan {
        let acc = self.svm.get_account(&self.plan).unwrap();
        Plan::try_deserialize(&mut acc.data.as_slice()).unwrap()
    }

    fn sub_state(&self) -> Subscription {
        let acc = self.svm.get_account(&self.subscription).unwrap();
        Subscription::try_deserialize(&mut acc.data.as_slice()).unwrap()
    }

    fn create_plan(&mut self) -> Result<(), FailedTransactionMetadata> {
        let ix = Instruction::new_with_bytes(
            self.program_id,
            &monthly::instruction::CreatePlan {
                plan_id: PLAN_ID,
                name: "Trading group".to_string(),
                amount: PLAN_AMOUNT,
                interval_seconds: INTERVAL,
            }
            .data(),
            monthly::accounts::CreatePlan {
                merchant: self.merchant.pubkey(),
                plan: self.plan,
                mint: self.mint,
                merchant_token_account: self.merchant_ata,
                system_program: system_program::ID,
            }
            .to_account_metas(None),
        );
        let signer = self.merchant.insecure_clone();
        self.send(ix, &signer)
    }

    fn subscribe(&mut self) -> Result<(), FailedTransactionMetadata> {
        let ix = Instruction::new_with_bytes(
            self.program_id,
            &monthly::instruction::Subscribe {}.data(),
            monthly::accounts::Subscribe {
                subscriber: self.subscriber.pubkey(),
                plan: self.plan,
                subscription: self.subscription,
                subscriber_token_account: self.subscriber_ata,
                merchant_token_account: self.merchant_ata,
                authority: self.authority,
                token_program: TOKEN_ID,
                system_program: system_program::ID,
            }
            .to_account_metas(None),
        );
        let signer = self.subscriber.insecure_clone();
        self.send(ix, &signer)
    }

    fn charge(&mut self) -> Result<(), FailedTransactionMetadata> {
        let ix = Instruction::new_with_bytes(
            self.program_id,
            &monthly::instruction::Charge {}.data(),
            monthly::accounts::Charge {
                payer: self.anyone.pubkey(),
                plan: self.plan,
                subscription: self.subscription,
                subscriber_token_account: self.subscriber_ata,
                merchant_token_account: self.merchant_ata,
                authority: self.authority,
                token_program: TOKEN_ID,
            }
            .to_account_metas(None),
        );
        let signer = self.anyone.insecure_clone();
        self.send(ix, &signer)
    }

    fn resume(&mut self) -> Result<(), FailedTransactionMetadata> {
        let ix = Instruction::new_with_bytes(
            self.program_id,
            &monthly::instruction::Resume {}.data(),
            monthly::accounts::Resume {
                subscriber: self.subscriber.pubkey(),
                plan: self.plan,
                subscription: self.subscription,
                subscriber_token_account: self.subscriber_ata,
                merchant_token_account: self.merchant_ata,
                authority: self.authority,
                token_program: TOKEN_ID,
            }
            .to_account_metas(None),
        );
        let signer = self.subscriber.insecure_clone();
        self.send(ix, &signer)
    }

    fn cancel(&mut self) -> Result<(), FailedTransactionMetadata> {
        let ix = Instruction::new_with_bytes(
            self.program_id,
            &monthly::instruction::Cancel {}.data(),
            monthly::accounts::Cancel {
                subscriber: self.subscriber.pubkey(),
                plan: self.plan,
                subscription: self.subscription,
            }
            .to_account_metas(None),
        );
        let signer = self.subscriber.insecure_clone();
        self.send(ix, &signer)
    }

    fn close_plan(&mut self, signer: &Keypair) -> Result<(), FailedTransactionMetadata> {
        let ix = Instruction::new_with_bytes(
            self.program_id,
            &monthly::instruction::ClosePlan {}.data(),
            monthly::accounts::ClosePlan {
                merchant: signer.pubkey(),
                plan: self.plan,
            }
            .to_account_metas(None),
        );
        self.send(ix, signer)
    }

    /// Moves the subscriber's balance away so a charge cannot be covered.
    fn drain_subscriber(&mut self) {
        let balance = self.balance(&self.subscriber_ata);
        let (mint, dest) = (self.mint, self.merchant_ata);
        TokenTransfer::new(&mut self.svm, &self.subscriber, &mint, &dest, balance)
            .send()
            .unwrap();
    }
}

fn assert_error(res: Result<(), FailedTransactionMetadata>, expected: MonthlyError) {
    let err = res.expect_err("transaction should fail");
    let code: u32 = expected.into();
    let text = format!("{:?}", err.err);
    assert!(
        text.contains(&format!("Custom({code})")),
        "expected error code {code}, got {text}\nlogs: {:#?}",
        err.meta.logs
    );
}

#[test]
fn create_plan_and_subscribe_collects_first_period() {
    let mut w = World::new();
    w.create_plan().unwrap();
    let plan = w.plan_state();
    assert_eq!(plan.amount, PLAN_AMOUNT);
    assert_eq!(plan.interval_seconds, INTERVAL);
    assert!(plan.active);
    assert_eq!(plan.name, "Trading group");

    w.approve(12 * PLAN_AMOUNT);
    let before = w.now();
    w.subscribe().unwrap();

    assert_eq!(w.balance(&w.merchant_ata), PLAN_AMOUNT);
    assert_eq!(w.balance(&w.subscriber_ata), 1_000 * USDC - PLAN_AMOUNT);
    let sub = w.sub_state();
    assert_eq!(sub.status, SubscriptionStatus::Active);
    assert_eq!(sub.periods_paid, 1);
    assert_eq!(sub.next_charge_at, before + INTERVAL);
    let plan = w.plan_state();
    assert_eq!(plan.subscriber_count, 1);
    assert_eq!(plan.total_collected, PLAN_AMOUNT);
}

#[test]
fn subscribe_without_mandate_fails() {
    let mut w = World::new();
    w.create_plan().unwrap();
    assert_error(w.subscribe(), MonthlyError::MandateMissing);
    assert_eq!(w.balance(&w.merchant_ata), 0);
}

#[test]
fn charge_only_when_due_and_only_plan_amount() {
    let mut w = World::new();
    w.create_plan().unwrap();
    w.approve(12 * PLAN_AMOUNT);
    w.subscribe().unwrap();
    let first_due = w.sub_state().next_charge_at;

    assert_error(w.charge(), MonthlyError::NotDue);

    w.warp(INTERVAL + 60);
    w.charge().unwrap();
    assert_eq!(w.balance(&w.merchant_ata), 2 * PLAN_AMOUNT);
    let sub = w.sub_state();
    assert_eq!(sub.periods_paid, 2);
    assert_eq!(sub.next_charge_at, first_due + INTERVAL, "schedule is kept, not restarted");

    // A second charge in the same period is refused even though the allowance would cover it.
    assert_error(w.charge(), MonthlyError::NotDue);
    assert_eq!(w.balance(&w.merchant_ata), 2 * PLAN_AMOUNT);
}

#[test]
fn missed_periods_restart_schedule_from_now() {
    let mut w = World::new();
    w.create_plan().unwrap();
    w.approve(12 * PLAN_AMOUNT);
    w.subscribe().unwrap();

    w.warp(3 * INTERVAL);
    let now = w.now();
    w.charge().unwrap();
    assert_eq!(w.balance(&w.merchant_ata), 2 * PLAN_AMOUNT, "only one period is charged");
    assert_eq!(w.sub_state().next_charge_at, now + INTERVAL);
}

#[test]
fn blocked_charge_retries_in_grace_then_pauses_then_resumes() {
    let mut w = World::new();
    w.create_plan().unwrap();
    w.approve(12 * PLAN_AMOUNT);
    w.subscribe().unwrap();
    w.drain_subscriber();

    w.warp(INTERVAL + 60);
    assert_error(w.charge(), MonthlyError::RetryLater);
    assert_eq!(w.sub_state().status, SubscriptionStatus::Active);

    w.warp(GRACE_SECONDS + 60);
    w.charge().unwrap();
    assert_eq!(w.sub_state().status, SubscriptionStatus::Paused);
    assert_error(w.charge(), MonthlyError::NotActive);

    assert_error(w.resume(), MonthlyError::InsufficientFunds);
    let (mint, ata) = (w.mint, w.subscriber_ata);
    MintTo::new(&mut w.svm, &w.merchant, &mint, &ata, 100 * USDC).send().unwrap();
    let merchant_before = w.balance(&w.merchant_ata);
    let now = w.now();
    w.resume().unwrap();
    let sub = w.sub_state();
    assert_eq!(sub.status, SubscriptionStatus::Active);
    assert_eq!(sub.next_charge_at, now + INTERVAL);
    assert_eq!(w.balance(&w.merchant_ata), merchant_before + PLAN_AMOUNT);
}

#[test]
fn exhausted_mandate_blocks_charge() {
    let mut w = World::new();
    w.create_plan().unwrap();
    w.approve(PLAN_AMOUNT);
    w.subscribe().unwrap();
    w.warp(INTERVAL + 60);
    assert_error(w.charge(), MonthlyError::RetryLater);
    w.approve(PLAN_AMOUNT);
    w.charge().unwrap();
    assert_eq!(w.balance(&w.merchant_ata), 2 * PLAN_AMOUNT);
}

#[test]
fn cancel_closes_subscription_and_stops_charges() {
    let mut w = World::new();
    w.create_plan().unwrap();
    w.approve(12 * PLAN_AMOUNT);
    w.subscribe().unwrap();
    let lamports_before = w.svm.get_balance(&w.subscriber.pubkey()).unwrap();

    w.cancel().unwrap();
    assert!(w.svm.get_account(&w.subscription).map_or(true, |a| a.data.is_empty()));
    assert!(w.svm.get_balance(&w.subscriber.pubkey()).unwrap() > lamports_before);
    assert_eq!(w.plan_state().subscriber_count, 0);

    w.warp(INTERVAL + 60);
    assert!(w.charge().is_err(), "no subscription account, charge must fail");
    assert_eq!(w.balance(&w.merchant_ata), PLAN_AMOUNT);
}

#[test]
fn closed_plan_refuses_subscriptions_and_charges() {
    let mut w = World::new();
    w.create_plan().unwrap();
    w.approve(12 * PLAN_AMOUNT);
    w.subscribe().unwrap();

    let stranger = w.anyone.insecure_clone();
    assert!(w.close_plan(&stranger).is_err(), "only the merchant may close");
    let merchant = w.merchant.insecure_clone();
    w.close_plan(&merchant).unwrap();
    assert!(!w.plan_state().active);

    w.warp(INTERVAL + 60);
    assert_error(w.charge(), MonthlyError::PlanClosed);
    assert_eq!(w.balance(&w.merchant_ata), PLAN_AMOUNT);

    w.cancel().unwrap();
}

#[test]
fn plan_validation() {
    let mut w = World::new();
    let bad = |w: &mut World, amount: u64, interval: i64, name: &str| {
        let ix = Instruction::new_with_bytes(
            w.program_id,
            &monthly::instruction::CreatePlan {
                plan_id: PLAN_ID,
                name: name.to_string(),
                amount,
                interval_seconds: interval,
            }
            .data(),
            monthly::accounts::CreatePlan {
                merchant: w.merchant.pubkey(),
                plan: w.plan,
                mint: w.mint,
                merchant_token_account: w.merchant_ata,
                system_program: system_program::ID,
            }
            .to_account_metas(None),
        );
        let signer = w.merchant.insecure_clone();
        w.send(ix, &signer)
    };
    assert_error(bad(&mut w, 0, INTERVAL, "x"), MonthlyError::ZeroAmount);
    assert_error(bad(&mut w, PLAN_AMOUNT, 30, "x"), MonthlyError::IntervalTooShort);
    assert_error(
        bad(&mut w, PLAN_AMOUNT, INTERVAL, &"n".repeat(MAX_NAME_LEN + 1)),
        MonthlyError::NameTooLong,
    );
}
